/**
 * Crawler Initialization
 * Creates and configures the Crawlee crawler instance
 */

import { CheerioCrawler, Configuration } from 'crawlee';
import { router } from '../crawlers/articleCrawler.js';

/**
 * Configures Crawlee storage directory
 * @param {string} storageDirectory - Path to storage directory
 */
export function configureCrawleeStorage(storageDirectory) {
    Configuration.getGlobalConfig().set('storageClientOptions', {
        localDataDirectory: storageDirectory,
    });
}

/**
 * Creates a configured CheerioCrawler instance
 * @returns {CheerioCrawler} Configured crawler instance
 */
export function createCrawler() {
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

