/**
 * PostgreSQL Queue Utilities
 * Handles fetching pending crawl requests from PostgreSQL and converting to Crawlee format
 */

import {
    findPendingCrawlRequests,
    markCrawlRequestsInProgress,
    findCrawlRequestByUrl,
} from '@acta/db';

/**
 * Gets pending crawl requests from PostgreSQL and converts them to Crawlee request format
 * Also marks them as in_progress to prevent duplicate processing
 * @param {number} batchSize - Maximum number of requests to fetch
 * @param {string} outletId - Optional filter by outlet ID
 * @returns {Promise<Array>} Array of Crawlee request objects
 */
export async function getPendingCrawlRequestsFromDB(batchSize = 100, outletId = undefined) {
    // Get pending requests from database
    const pendingRequests = await findPendingCrawlRequests(batchSize, outletId);
    
    if (pendingRequests.length === 0) {
        console.log('ℹ️  No pending crawl requests in database');
        return [];
    }
    
    // Mark them as in_progress to prevent duplicate processing
    const ids = pendingRequests.map(req => req.id);
    await markCrawlRequestsInProgress(ids);
    
    console.log(`✅ Fetched ${pendingRequests.length} pending crawl requests from PostgreSQL`);
    
    // Convert to Crawlee request format
    const crawleeRequests = pendingRequests.map(request => ({
        url: request.url,
        label: 'article',
        userData: {
            crawlRequestId: request.id,
            outletId: request.outletId,
            // Note: RSS metadata is not available here, but we can get outlet info if needed
        },
    }));
    
    return crawleeRequests;
}

/**
 * Gets a crawl request by URL (for backward compatibility)
 * @param {string} url - Article URL
 * @returns {Promise<Object|null>} CrawlRequest or null
 */
export async function getCrawlRequestByUrl(url) {
    return findCrawlRequestByUrl(url);
}

