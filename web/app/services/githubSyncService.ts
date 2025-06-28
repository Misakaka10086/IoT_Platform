// app/services/githubSyncService.ts

import pool, { withRetry } from '../../lib/database'; // 导入 withRetry

// 标志位，防止重复执行
let isSyncing = false;
let hasSynced = false;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = process.env.REPO_OWNER;
const REPO_NAME = process.env.REPO_NAME;

interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            date: string;
        };
    };
}

/**
 * Fetches data from the GitHub API with authentication and error handling.
 */
async function fetchGitHubAPI<T>(endpoint: string): Promise<T> {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${endpoint}`;
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
        },
    });

    if (!response.ok) {
        throw new Error(`GitHub API request failed for ${endpoint}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

/**
 * Fetches all commits for a given branch or SHA, handling pagination.
 */
async function getAllCommitsForBranch(branchName: string): Promise<GitHubCommit[]> {
    let allCommits: GitHubCommit[] = [];
    let page = 1;
    while (true) {
        const commits = await fetchGitHubAPI<GitHubCommit[]>(`commits?sha=${branchName}&per_page=100&page=${page}`);
        if (commits.length === 0) {
            break;
        }
        allCommits = allCommits.concat(commits);
        page++;
    }
    return allCommits;
}

/**
 * Synchronizes GitHub commits to the local database.
 */
export async function syncCommits() {
    if (isSyncing || hasSynced) {
        console.log('🔄 GitHub sync already running or completed. Skipping.');
        return;
    }

    if (!GITHUB_TOKEN || !REPO_OWNER || !REPO_NAME) {
        console.warn('⚠️ Missing GitHub environment variables (GITHUB_TOKEN, REPO_OWNER, REPO_NAME). Skipping commit sync.');
        return;
    }

    console.log('🚀 Starting GitHub commit synchronization...');
    isSyncing = true;

    try {
        // 1. Get all branches
        const branches = await fetchGitHubAPI<{ name: string }[]>('branches');
        console.log(`🌿 Found ${branches.length} branches: ${branches.map(b => b.name).join(', ')}`);

        // 2. Fetch all commits from all branches and collect unique ones
        const allCommitsMap = new Map<string, { message: string; authored_at: string }>();

        for (const branch of branches) {
            console.log(`🔍 Fetching commits for branch: ${branch.name}...`);
            const commits = await getAllCommitsForBranch(branch.name);
            for (const commit of commits) {
                if (!allCommitsMap.has(commit.sha)) {
                    allCommitsMap.set(commit.sha, {
                        message: commit.commit.message,
                        authored_at: commit.commit.author.date,
                    });
                }
            }
            console.log(`✅ Fetched ${commits.length} commits for branch ${branch.name}.`);
        }

        const uniqueCommits = Array.from(allCommitsMap.values());
        const uniqueShas = Array.from(allCommitsMap.keys());
        console.log(`✨ Total unique commits found across all branches: ${uniqueCommits.length}`);

        if (uniqueCommits.length === 0) {
            console.log('✅ No new unique commits to process.');
            hasSynced = true; // 标记为已同步
            return;
        }

        // 3. Insert new commits into the database
        await withRetry(async () => {
            const client = await pool.connect();
            try {
                // 1. 准备批量插入的数据
                const values: any[] = [];
                const valuePlaceholders: string[] = [];
                let paramIndex = 1;

                for (let i = 0; i < uniqueCommits.length; i++) {
                    const commit = uniqueCommits[i];
                    const sha = uniqueShas[i];

                    valuePlaceholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
                    values.push(sha, commit.message, commit.authored_at);
                }

                // 2. 构建批量插入的 SQL 查询
                const queryText = `
                    INSERT INTO git_info (version, message, authored_at)
                    VALUES ${valuePlaceholders.join(', ')}
                    ON CONFLICT (version) DO NOTHING
                `;

                // 3. 执行单次批量插入
                const result = await client.query(queryText, values);
                console.log(`💾 Database sync complete. Added ${result.rowCount} new commits.`);

            } finally {
                client.release();
            }
        }, 3, 'Sync GitHub commits to database'); // 使用 withRetry 并提供操作名称

        hasSynced = true;
    } catch (error) {
        console.error('❌ Error during GitHub commit synchronization:', error);
    } finally {
        isSyncing = false;
    }
}