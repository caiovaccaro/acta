/**
 * Crawler Initialization
 * Creates and configures the Crawlee crawler instance
 */

import { CheerioCrawler, Configuration } from 'crawlee';
import { router } from '../crawlers/articleCrawler.js';

/**
 * Configures Crawlee storage directory (optional, for backward compatibility)
 * Note: We no longer rely on Crawlee storage - all data is in PostgreSQL
 * This is kept for optional export compatibility
 * @param {string} storageDirectory - Path to storage directory
 */
export function configureCrawleeStorage(storageDirectory) {
    // Optional: Configure storage if needed for backward compatibility
    // Can be removed once export scripts are fully migrated to PostgreSQL
    Configuration.getGlobalConfig().set('storageClientOptions', {
        localDataDirectory: storageDirectory,
    });
}

/**
 * Creates a configured CheerioCrawler instance
 * @deprecated Use createCrawler() from crawlerFactory.js instead (supports paywall)
 * @returns {CheerioCrawler} Configured crawler instance
 */
export function createSimpleCrawler() {
    // Deprecated: Use crawlerFactory.createCrawler() for paywall support
    return new CheerioCrawler({
        // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
        requestHandler: router,
        // Note: maxRequestsPerCrawl removed - we control batch size via PostgreSQL queue
        // Allow RSS and Atom feed content types
        additionalMimeTypes: ['application/rss+xml', 'application/atom+xml'],
    });
}

/**
 * Creates Crawlee request objects for RSS feeds
 * @param {Array} feeds - Array of feed objects with url and source
 * @returns {Array} Array of Crawlee request objects
 */
export function createRssRequests(feeds) {
    return feeds.map(feed => ({
        url: feed.url,
        label: 'rss',
        userData: { 
            source: feed.source,
            feedUrl: feed.url
        }
    }));
}

