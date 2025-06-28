// app/api/git/info/[version]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import pool, { withRetry } from '../../../../../lib/database';
import { GitCommitInfo } from '../../../../../types/ota-types';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ version: string }> } // <--- 修复：将 params 类型修正为 Promise
) {
    try {
        const { version } = await params; // <--- 修复：添加 await 来解析 Promise

        // Validate the version parameter to ensure it looks like a SHA hash
        if (!version || !/^[a-f0-9]{7,40}$/.test(version)) {
            return NextResponse.json({ error: 'A valid Git commit SHA (version) is required.' }, { status: 400 });
        }

        const commitInfo = await withRetry(async () => {
            const result = await pool.query<GitCommitInfo>(
                'SELECT version, message, authored_at FROM git_info WHERE version = $1',
                [version]
            );
            return result.rows[0] || null;
        }, 3, `Get git info for version: ${version}`);

        if (!commitInfo) {
            return NextResponse.json({ error: 'Commit information not found.' }, { status: 404 });
        }

        return NextResponse.json(commitInfo);

    } catch (error) {
        console.error('Error fetching git commit info:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch commit info';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}