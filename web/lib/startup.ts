// app/lib/startup.ts

import { syncCommits } from '../app/services/githubSyncService';

// This file is imported once in the root layout, ensuring this code runs only on server start.
console.log('🚀 Running application startup tasks...');

// We run the sync process but don't block the server start.
// Errors are caught and logged to prevent crashing the application.
syncCommits().catch(error => {
    console.error("Startup task 'syncCommits' failed:", error);
});