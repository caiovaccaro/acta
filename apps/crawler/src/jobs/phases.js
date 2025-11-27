/**
 * Crawler Job Phases
 * Handles the two main phases of the crawler job
 */

import { getPendingCrawlRequestsFromDB } from '../utils/postgresQueue.js';

/**
 * Phase 1: Process RSS feeds
 * Fetches RSS feeds and creates crawl requests in PostgreSQL
 * @param {CheerioCrawler} crawler - Crawler instance
 * @param {Array} rssRequests - Array of RSS feed requests
 * @returns {Promise<void>}
 */
export async function processRssFeeds(crawler, rssRequests) {
    console.log('📡 Phase 1: Processing RSS feeds...');
    await crawler.run(rssRequests);
    console.log('✅ Phase 1 complete: RSS feeds processed\n');
}

/**
 * Phase 2: Process articles from PostgreSQL queue
 * Fetches pending articles in batches and processes them
 * @param {CheerioCrawler|PlaywrightCrawler} crawler - Crawler instance
 * @param {Object} config - Configuration object with batchSize, maxArticlesPerRun, and optional outletId
 * @param {string} outletId - Optional outlet ID to filter articles by outlet (for paywall support)
 * @returns {Promise<Object>} Processing statistics
 */
export async function processArticles(crawler, config, outletId = null) {
    const { batchSize, maxArticlesPerRun } = config;
    
    console.log('📄 Phase 2: Processing articles from PostgreSQL queue...');
    console.log(`   Batch size: ${batchSize} articles per batch`);
    if (maxArticlesPerRun) {
        console.log(`   Max per run: ${maxArticlesPerRun} articles`);
    }
    if (outletId) {
        console.log(`   Filtering by outlet: ${outletId}`);
    }
    
    let totalProcessed = 0;
    let hasMore = true;
    let batchNumber = 0;
    
    while (hasMore) {
        // Check if we've hit the max articles limit (for periodic jobs)
        if (maxArticlesPerRun && totalProcessed >= maxArticlesPerRun) {
            console.log(`\n⚠️  Reached max articles limit (${maxArticlesPerRun}). Stopping.`);
            hasMore = false;
            break;
        }
        
        // Calculate how many to fetch in this batch
        const remainingLimit = maxArticlesPerRun 
            ? Math.min(batchSize, maxArticlesPerRun - totalProcessed)
            : batchSize;
        
        const articleRequests = await getPendingCrawlRequestsFromDB(remainingLimit, outletId);
        
        if (articleRequests.length === 0) {
            hasMore = false;
            if (totalProcessed === 0) {
                console.log('ℹ️  No articles to process');
            }
        } else {
            batchNumber++;
            console.log(`\n📖 Batch ${batchNumber}: Processing ${articleRequests.length} articles...`);
            await crawler.run(articleRequests);
            totalProcessed += articleRequests.length;
            console.log(`✅ Batch ${batchNumber} complete: ${articleRequests.length} articles (total: ${totalProcessed})`);
            
            // If we got fewer than batch size, we're done (no more pending)
            if (articleRequests.length < remainingLimit) {
                hasMore = false;
            }
        }
    }
    
    if (totalProcessed > 0) {
        console.log(`\n✅ Phase 2 complete: Processed ${totalProcessed} articles in ${batchNumber} batch(es)`);
        if (maxArticlesPerRun && totalProcessed >= maxArticlesPerRun) {
            console.log(`   ℹ️  Hit max limit. More articles may be pending. Next run will continue.`);
        }
    }
    
    return {
        totalProcessed,
        batchesProcessed: batchNumber,
        hitLimit: maxArticlesPerRun && totalProcessed >= maxArticlesPerRun,
    };
}

