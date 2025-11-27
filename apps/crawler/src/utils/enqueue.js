import { getPendingCrawlRequestsFromDB } from './postgresQueue.js';

/**
 * Enqueues pending article links for full content extraction from PostgreSQL
 * This function is called after RSS feed processing is complete
 * @param {Array<string>} outletIds - Optional array of outlet IDs to filter by
 * @returns {Promise<Array>} Array of request objects ready to be processed
 */
export async function enqueuePendingArticles(outletIds = null) {
    // Get pending crawl requests from PostgreSQL
    // If outletIds are provided, fetch for each outlet separately and combine
    let allRequests = [];
    
    if (outletIds && outletIds.length > 0) {
        console.log(`🔍 Fetching articles for ${outletIds.length} outlet(s)...`);
        // Fetch requests for each selected outlet
        // Skip attempts filter when outlet filtering is active to process all pending articles
        for (const outletId of outletIds) {
            const requests = await getPendingCrawlRequestsFromDB(1000, outletId, true);
            console.log(`   Found ${requests.length} pending articles for outlet ${outletId}`);
            allRequests = allRequests.concat(requests);
        }
    } else {
        // Get all pending requests (no outlet filter)
        allRequests = await getPendingCrawlRequestsFromDB(1000);
    }
    
    if (allRequests.length === 0) {
        console.log('ℹ️  No pending articles to enqueue');
        return [];
    }
    
    console.log(`✅ Prepared ${allRequests.length} article URLs for content extraction`);
    
    return allRequests;
}

