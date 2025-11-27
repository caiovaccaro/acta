/**
 * Monitoring and Metrics
 * Tracks crawler job metrics and provides logging
 */

import { countCrawlRequestsByStatus, countArticles } from '@acta/db';

/**
 * Logs current queue and processing metrics
 * @returns {Promise<Object>} Metrics object
 */
export async function logMetrics() {
    try {
        const statusCounts = await countCrawlRequestsByStatus();
        const articleCount = await countArticles();
        
        console.log('\n📊 Current Queue Status:');
        console.log(`   Pending: ${statusCounts.pending}`);
        console.log(`   In Progress: ${statusCounts.in_progress}`);
        console.log(`   Done: ${statusCounts.done}`);
        console.log(`   Failed: ${statusCounts.failed}`);
        if (statusCounts.failedExceededRetries > 0) {
            console.log(`   Failed (exceeded retries): ${statusCounts.failedExceededRetries}`);
        }
        console.log(`\n📄 Total Articles in Database: ${articleCount}`);
        
        return {
            queue: statusCounts,
            articles: articleCount,
        };
    } catch (error) {
        console.error('❌ Error fetching metrics:', error);
        return null;
    }
}

/**
 * Logs metrics at the start of a job run
 */
export async function logStartMetrics() {
    console.log('\n📊 Starting metrics:');
    await logMetrics();
}

/**
 * Logs metrics at the end of a job run
 */
export async function logEndMetrics() {
    console.log('\n📊 Final metrics:');
    await logMetrics();
}

