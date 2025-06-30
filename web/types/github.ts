export interface GitHubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            date: string;
        };
    };
}
