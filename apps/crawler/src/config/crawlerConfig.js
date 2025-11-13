/**
 * Crawler Configuration
 * Centralized configuration for the crawler job
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Gets crawler configuration from environment variables
 * @returns {Object} Configuration object
 */
export function getCrawlerConfig() {
    return {
        // Batch processing configuration
        batchSize: process.env.BATCH_SIZE 
            ? parseInt(process.env.BATCH_SIZE, 10) 
            : 100, // Articles per batch (default: 100)
        
        maxArticlesPerRun: process.env.MAX_ARTICLES_PER_RUN 
            ? parseInt(process.env.MAX_ARTICLES_PER_RUN, 10) 
            : null, // null = process all (for manual runs), set to limit for periodic jobs
        
        // Stuck request recovery
        stuckRequestThresholdMinutes: process.env.STUCK_REQUEST_THRESHOLD_MINUTES
            ? parseInt(process.env.STUCK_REQUEST_THRESHOLD_MINUTES, 10)
            : 60, // Reset requests stuck in_progress longer than this
    };
}

/**
 * Loads RSS feeds configuration from outlets.json
 * @returns {Array} Array of feed objects with url and source
 */
export function loadRssFeeds() {
    const outletsPath = resolve(__dirname, '../config/outlets.json');
    const verifiedFeeds = JSON.parse(readFileSync(outletsPath, 'utf-8'));
    return verifiedFeeds.validFeeds;
}

/**
 * Validates crawler configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Validation result with warnings
 */
export function validateConfig(config) {
    const warnings = [];
    
    if (config.maxArticlesPerRun && config.batchSize > config.maxArticlesPerRun) {
        warnings.push(`BATCH_SIZE (${config.batchSize}) exceeds MAX_ARTICLES_PER_RUN (${config.maxArticlesPerRun})`);
    }
    
    return {
        isValid: warnings.length === 0,
        warnings,
    };
}

