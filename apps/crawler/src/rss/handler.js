import * as cheerio from 'cheerio';
import { extractRSSItem, extractAtomEntry } from './extractors.js';
import { 
    findOrCreateOutlet, 
    findCrawlRequestByUrl, 
    createOrUpdateCrawlRequest,
    Ideology,
    CrawlStatus,
    connectDatabase
} from '@acta/db';

/**
 * Sets up the parser for RSS/XML content
 * @param {Function|undefined} $ - Cheerio instance (may be undefined for XML)
 * @param {string|undefined} body - Raw HTML/XML body
 * @returns {Function} Cheerio parser function
 */
export function setupParser($, body) {
    if (typeof $ === 'function') {
        return $;
    }
    if (body) {
        return cheerio.load(body, { xmlMode: true });
    }
    return cheerio.load('');
}

/**
 * Extracts articles from RSS 2.0 format
 * @param {Function} $parser - Cheerio parser instance
 * @returns {Array} Array of article objects
 */
export function extractRSSArticles($parser) {
    const items = $parser('item');
    if (items.length === 0) {
        return null;
    }
    
    const articles = [];
    for (let i = 0; i < items.length; i++) {
        articles.push(extractRSSItem($parser(items[i])));
    }
    return articles;
}

/**
 * Extracts articles from Atom format
 * @param {Function} $parser - Cheerio parser instance
 * @returns {Array} Array of article objects
 */
export function extractAtomArticles($parser) {
    const entries = $parser('entry');
    if (entries.length === 0) {
        return null;
    }
    
    const articles = [];
    for (let i = 0; i < entries.length; i++) {
        articles.push(extractAtomEntry($parser(entries[i])));
    }
    return articles;
}

/**
 * Processes a single RSS article and creates CrawlRequest in PostgreSQL
 * @param {Object} article - Article object with title, link, description, pubDate
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {string} outletId - Outlet ID from database
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function (for backward compatibility)
 * @returns {Object} Processing result
 */
async function processRSSArticle(article, source, feedUrl, outletId, log, pushData) {
    const { title, link, description, pubDate } = article;
    
    // Skip if article link is empty
    if (!link) {
        log.warning(`Skipping article with no link: ${title}`);
        return { processed: false, reason: 'no_link' };
    }
    
    // Check if crawl request already exists in database
    const existingRequest = await findCrawlRequestByUrl(link);
    if (existingRequest) {
        // Skip if already done or in progress
        if (existingRequest.status === CrawlStatus.done || existingRequest.status === CrawlStatus.in_progress) {
            log.info(`Skipping already processed article: ${link.substring(0, 80)}...`);
            return { processed: false, reason: 'duplicate' };
        }
        // If failed, it will be retried by createOrUpdateCrawlRequest
    }
    
    // Create or update crawl request in PostgreSQL
    try {
        await createOrUpdateCrawlRequest({
            url: link,
            outletId: outletId,
            status: CrawlStatus.pending,
        });
        
        // Save RSS metadata (for backward compatibility with existing export scripts)
        await pushData({
            source,
            feedUrl,
            title,
            link,
            description,
            pubDate,
        });
        
        return { processed: true };
    } catch (error) {
        log.error(`Failed to create crawl request for ${link}:`, error);
        return { processed: false, reason: 'error', error };
    }
}

/**
 * Processes multiple RSS articles
 * @param {Array} articles - Array of article objects
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {string} outletId - Outlet ID from database
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 * @param {string} format - Feed format ('RSS' or 'Atom')
 * @returns {Object} Processing statistics
 */
async function processRSSArticles(articles, source, feedUrl, outletId, log, pushData, format) {
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const article of articles) {
        const result = await processRSSArticle(article, source, feedUrl, outletId, log, pushData);
        if (result.processed) {
            processedCount++;
        } else {
            skippedCount++;
        }
    }
    
    log.info(`Extracted ${processedCount} new items, skipped ${skippedCount} duplicates from ${format} feed`);
    return { processedCount, skippedCount };
}

/**
 * Processes RSS feed and extracts articles, writing to PostgreSQL
 * @param {Function} $parser - Cheerio parser instance
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function (for backward compatibility)
 */
export async function processRSSFeed($parser, source, feedUrl, log, pushData) {
    // Try RSS 2.0 format first
    let articles = extractRSSArticles($parser);
    let format = 'RSS';
    
    // Fallback to Atom format
    if (!articles) {
        articles = extractAtomArticles($parser);
        format = 'Atom';
    }
    
    if (!articles) {
        log.warning(`No RSS/Atom items found in feed: ${feedUrl}`);
        return;
    }
    
    // Get or create outlet in database
    // For now, default to Center ideology - this can be configured later
    const outlet = await findOrCreateOutlet(source, Ideology.Center, 0.5, [feedUrl]);
    
    // Process articles and create CrawlRequests in PostgreSQL
    const stats = await processRSSArticles(articles, source, feedUrl, outlet.id, log, pushData, format);
    
    log.info(`Added ${stats.processedCount} new crawl requests to PostgreSQL queue, skipped ${stats.skippedCount} duplicates`);
}

