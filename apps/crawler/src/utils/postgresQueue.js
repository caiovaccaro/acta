/**
 * PostgreSQL Queue Utilities
 * Handles fetching pending crawl requests from PostgreSQL and converting to Crawlee format
 */

import {
    claimPendingCrawlRequests,
    findPendingCrawlRequests,
    markCrawlRequestsInProgress,
    findCrawlRequestByUrl,
} from '@acta/db';

export function claimedCrawlRequestsToCrawlerRequests(
    claimedRequests,
    outletConfigs = [],
) {
    const outletMap = new Map(outletConfigs.map((outlet) => [outlet.name, outlet]));
    return claimedRequests.map((request) => ({
        url: request.url,
        label: 'article',
        userData: {
            crawlRequestId: request.id,
            outletId: request.outletId,
            source: request.outletName,
            outletConfig: outletMap.get(request.outletName) ?? null,
        },
    }));
}

export async function claimPendingArticles(
    outletIds,
    limit,
    outletConfigs = [],
) {
    const claimed = await claimPendingCrawlRequests(outletIds, limit);
    return claimedCrawlRequestsToCrawlerRequests(claimed, outletConfigs);
}

/**
 * Gets pending crawl requests from PostgreSQL and converts them to Crawlee request format
 * Also marks them as in_progress to prevent duplicate processing
 * @param {number} batchSize - Maximum number of requests to fetch
 * @param {string} outletId - Optional filter by outlet ID
 * @returns {Promise<Array>} Array of Crawlee request objects
 */
export async function getPendingCrawlRequestsFromDB(batchSize = 100, outletId = undefined, skipAttemptsFilter = false) {
    // Get pending requests from database
    // If skipAttemptsFilter is true, we'll fetch all pending regardless of attempts
    // Also include in_progress articles that might be stuck
    let pendingRequests;
    if (skipAttemptsFilter && outletId) {
        // Fetch all pending AND in_progress for this outlet, ignoring attempts limit
        const { prisma, CrawlStatus } = await import('@acta/db');
        pendingRequests = await prisma.crawlRequest.findMany({
            where: {
                outletId: outletId,
                status: {
                    in: [CrawlStatus.pending, CrawlStatus.in_progress],
                },
            },
            include: {
                outlet: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
            take: batchSize,
        });
    } else {
        pendingRequests = await findPendingCrawlRequests(batchSize, outletId);
    }
    
    if (pendingRequests.length === 0) {
        console.log('ℹ️  No pending crawl requests in database');
        return [];
    }
    
    // Mark them as in_progress to prevent duplicate processing
    const ids = pendingRequests.map(req => req.id);
    await markCrawlRequestsInProgress(ids);
    
    console.log(`✅ Fetched ${pendingRequests.length} pending crawl requests from PostgreSQL`);
    
    // Load outlet configurations to match with requests
    const { loadOutlets } = await import('../config/crawlerConfig.js');
    const outlets = loadOutlets();
    const outletMap = new Map(outlets.map(o => [o.name, o]));
    
    // Convert to Crawlee request format
    const crawleeRequests = pendingRequests.map(request => {
        const outletName = request.outlet?.name || 'unknown';
        const outletConfig = outletMap.get(outletName) || null;
        
        return {
            url: request.url,
            label: 'article',
            userData: {
                crawlRequestId: request.id,
                outletId: request.outletId,
                source: outletName,
                outletConfig: outletConfig, // Include outlet config for paywall handling
                // Note: RSS metadata (title, description, pubDate) is not stored in CrawlRequest
                // It will be retrieved from the article URL when processing
            },
        };
    });
    
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

