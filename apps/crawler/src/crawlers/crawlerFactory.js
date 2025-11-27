/**
 * Crawler Factory
 * Creates CheerioCrawler for all outlets (free sites only)
 */

import { CheerioCrawler } from 'crawlee';
import { cheerioRouter } from './articleCrawler.js';

/**
 * Create crawler instance for free outlets
 * @param {Object} outletConfig - Outlet configuration
 * @param {Function} requestHandler - Request handler function (unused, kept for compatibility)
 * @returns {CheerioCrawler} Cheerio crawler instance
 */
export function createCrawler(outletConfig, requestHandler) {
    return createCheerioCrawler(outletConfig, requestHandler);
}

/**
 * Create CheerioCrawler for simple sites
 * @param {Object} outletConfig - Outlet configuration
 * @param {Function} requestHandler - Request handler function
 * @returns {CheerioCrawler} Cheerio crawler instance
 */
function createCheerioCrawler(outletConfig, requestHandler) {
    const { rateLimit } = outletConfig;
    
    // Use cheerioRouter directly as requestHandler (handlers already registered)
    return new CheerioCrawler({
        requestHandler: cheerioRouter,
        maxRequestsPerCrawl: 100,
        additionalMimeTypes: ['application/rss+xml', 'application/atom+xml'],
        maxConcurrency: Math.min(rateLimit.maxRPS, 10),
        requestHandlerTimeoutSecs: 60,
    });
}


