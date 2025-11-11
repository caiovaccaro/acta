import * as cheerio from 'cheerio';
import { extractRSSItem, extractAtomEntry } from './extractors.js';
import { isArticleProcessed, addPendingArticle } from '../utils/index.js';

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
 * Processes a single RSS article (saves RSS metadata)
 * @param {Object} article - Article object with title, link, description, pubDate
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 * @returns {Object} Processing result
 */
async function processRSSArticle(article, source, feedUrl, log, pushData) {
    const { title, link, description, pubDate } = article;
    
    // Skip if article link is empty
    if (!link) {
        log.warning(`Skipping article with no link: ${title}`);
        return { processed: false, reason: 'no_link' };
    }
    
    // Skip if already processed
    if (await isArticleProcessed(link)) {
        log.info(`Skipping duplicate article: ${link.substring(0, 80)}...`);
        return { processed: false, reason: 'duplicate' };
    }
    
    // Save RSS metadata
    await pushData({
        source,
        feedUrl,
        title,
        link,
        description,
        pubDate,
    });
    
    // Don't mark as processed yet - wait until full content is extracted
    // This allows the article to be enqueued for content extraction
    return { processed: true };
}

/**
 * Processes multiple RSS articles
 * @param {Array} articles - Array of article objects
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 * @param {string} format - Feed format ('RSS' or 'Atom')
 * @returns {Object} Processing statistics
 */
async function processRSSArticles(articles, source, feedUrl, log, pushData, format) {
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const article of articles) {
        const result = await processRSSArticle(article, source, feedUrl, log, pushData);
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
 * Processes RSS feed and extracts articles
 * @param {Function} $parser - Cheerio parser instance
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
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
    
    // Process articles (save RSS metadata)
    await processRSSArticles(articles, source, feedUrl, log, pushData, format);
    
    // Add articles to pending queue for later processing (decoupled)
    for (const article of articles) {
        if (article.link && !await isArticleProcessed(article.link)) {
            await addPendingArticle(article, source);
        }
    }
    
    log.info(`Added ${articles.length} articles to pending queue for content extraction`);
}

