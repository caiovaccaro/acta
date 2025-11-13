/**
 * Main Crawler Job
 * Orchestrates RSS feed processing and article extraction
 */

import { setupDatabase, teardownDatabase } from './database.js';
import { configureCrawleeStorage, createCrawler, createRssRequests } from './crawler.js';
import { processRssFeeds, processArticles } from './phases.js';
import { getCrawlerConfig, loadRssFeeds, validateConfig } from '../config/crawlerConfig.js';

// Load configuration
const config = getCrawlerConfig();
const validation = validateConfig(config);

// Show warnings if any
if (validation.warnings.length > 0) {
    validation.warnings.forEach(warning => {
        console.warn(`⚠️  ${warning}`);
    });
}

// Setup database and reset stuck requests
await setupDatabase(config.stuckRequestThresholdMinutes);

// Configure Crawlee storage
configureCrawleeStorage(config.storageDirectory);

// Load RSS feeds and create requests
const feeds = loadRssFeeds();
const rssRequests = createRssRequests(feeds);

// Create crawler instance
const crawler = createCrawler();

// Phase 1: Process RSS feeds
await processRssFeeds(crawler, rssRequests);

// Phase 2: Process articles from PostgreSQL queue
await processArticles(crawler, {
    batchSize: config.batchSize,
    maxArticlesPerRun: config.maxArticlesPerRun,
});

console.log('\n✨ Crawling complete!');

// Cleanup
await teardownDatabase();
