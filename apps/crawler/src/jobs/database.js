/**
 * Database Setup and Teardown
 * Handles database connection and recovery operations
 */

import { connectDatabase, disconnectDatabase, resetStuckInProgressRequests } from '@acta/db';

/**
 * Connects to database and resets stuck requests
 * @param {number} stuckThresholdMinutes - Minutes after which to reset stuck requests
 * @returns {Promise<void>}
 */
export async function setupDatabase(stuckThresholdMinutes = 60) {
    await connectDatabase();
    
    // Reset any stuck in_progress requests (from crashed jobs)
    const stuckResetCount = await resetStuckInProgressRequests(stuckThresholdMinutes);
    if (stuckResetCount > 0) {
        console.log(`⚠️  Reset ${stuckResetCount} stuck in_progress requests back to pending`);
    }
}

/**
 * Disconnects from database
 * @returns {Promise<void>}
 */
export async function teardownDatabase() {
    await disconnectDatabase();
}

