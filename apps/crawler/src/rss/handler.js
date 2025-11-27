import * as cheerio from 'cheerio';
import { extractRSSItem, extractAtomEntry } from './extractors.js';
import { createOrUpdateCrawlRequest, CrawlStatus, findArticleByUrl, findCrawlRequestByUrl } from '@acta/db';

/**
 * Check if an article has already been processed
 * @param {string} url - Article URL
 * @returns {Promise<boolean>} True if article exists
 */
async function isArticleProcessed(url) {
    // Check if article already exists
    const article = await findArticleByUrl(url);
    if (article) {
        return true;
    }
    
    // Check if crawl request exists and is done
    const crawlRequest = await findCrawlRequestByUrl(url);
    if (crawlRequest && crawlRequest.status === CrawlStatus.done) {
        return true;
    }
    
    return false;
}

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
    // Try multiple selectors as RSS feeds can vary
    let items = $parser('item');
    
    // If no items found, try with namespace
    if (items.length === 0) {
        items = $parser('rss item, feed item, channel item');
    }
    
    // If still no items, try case-insensitive (some feeds have uppercase)
    if (items.length === 0) {
        const allElements = $parser('*');
        items = allElements.filter((i, el) => {
            const tagName = el.tagName || el.name || '';
            return tagName.toLowerCase() === 'item';
        });
    }
    
    if (items.length === 0) {
        return null;
    }
    
    const articles = [];
    for (let i = 0; i < items.length; i++) {
        const article = extractRSSItem($parser(items[i]), $parser);
        // Only add articles with valid links
        if (article && article.link) {
            articles.push(article);
        }
    }
    
    return articles.length > 0 ? articles : null;
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
        articles.push(extractAtomEntry($parser(entries[i]), $parser));
    }
    return articles;
}

/**
 * Processes a single RSS article (saves RSS metadata)
 * @param {Object} article - Article object with title, link, description, pubDate, categories
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 * @param {string} outletId - Outlet ID from database (required for PostgreSQL)
 * @returns {Object} Processing result
 */
async function processRSSArticle(article, source, feedUrl, log, pushData, outletId = null) {
    const { title, link, description, pubDate, categories = [] } = article;
    
    // Skip if article link is empty
    if (!link) {
        log.warning(`Skipping article with no link: ${title}`);
        return { processed: false, reason: 'no_link' };
    }
    
    // Skip if already processed (check PostgreSQL)
    if (await isArticleProcessed(link)) {
        log.info(`Skipping duplicate article: ${link.substring(0, 80)}...`);
        return { processed: false, reason: 'duplicate' };
    }
    
    // Save RSS metadata to Crawlee storage (optional, for backward compatibility)
    if (pushData) {
        await pushData({
            source,
            feedUrl,
            title,
            link,
            description,
            pubDate,
            categories: categories.join(', '), // Store categories as comma-separated string
        });
    }
    
    // Save to PostgreSQL as pending crawl request
    try {
        await createOrUpdateCrawlRequest({
            url: link,
            outletId: outletId,
            status: CrawlStatus.pending,
        });
        return { processed: true };
    } catch (error) {
        log.error(`Failed to save article to PostgreSQL: ${error.message}`);
        return { processed: false, reason: 'database_error' };
    }
}

/**
 * Processes multiple RSS articles
 * @param {Array} articles - Array of article objects
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 * @param {string} format - Feed format ('RSS' or 'Atom')
 * @param {string} outletId - Outlet ID from database (required for PostgreSQL)
 * @returns {Object} Processing statistics
 */
async function processRSSArticles(articles, source, feedUrl, log, pushData, format, outletId = null) {
    let processedCount = 0;
    let skippedCount = 0;
    
    for (const article of articles) {
        const result = await processRSSArticle(article, source, feedUrl, log, pushData, outletId);
        if (result.processed) {
            processedCount++;
        } else {
            skippedCount++;
        }
    }
    
    const logMessage = `Extracted ${processedCount} new items, skipped ${skippedCount} from ${format} feed`;
    log.info(logMessage);
    return { processedCount, skippedCount };
}

/**
 * Processes RSS feed and extracts articles
 * @param {Function} $parser - Cheerio parser instance
 * @param {string} source - News source name
 * @param {string} feedUrl - RSS feed URL
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 * @param {string} outletId - Outlet ID from database (required for PostgreSQL)
 */
export async function processRSSFeed($parser, source, feedUrl, log, pushData, outletId = null) {
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
        // Debug: Check what's actually in the feed
        const items = $parser('item');
        const entries = $parser('entry');
        log.warning(`Debug: Found ${items.length} <item> elements and ${entries.length} <entry> elements`);
        if (items.length > 0) {
            const firstItem = $parser(items[0]);
            log.warning(`Debug: First item HTML: ${firstItem.html()?.substring(0, 500)}`);
        }
        return;
    }
    
    log.info(`Found ${articles.length} articles in ${format} feed`);
    
    // Debug: Log first article to see if link is extracted correctly
    if (articles.length > 0) {
        const firstArticle = articles[0];
        log.info(`Sample article: title="${firstArticle.title?.substring(0, 60)}", link="${firstArticle.link?.substring(0, 80)}"`);
        if (!firstArticle.link) {
            log.warning(`WARNING: First article has no link! Title: ${firstArticle.title}`);
        }
    }
    
    // Process articles (save RSS metadata to PostgreSQL)
    if (!outletId) {
        log.error('Outlet ID is required to save articles to PostgreSQL');
        return;
    }
    
    const stats = await processRSSArticles(articles, source, feedUrl, log, pushData, format, outletId);
    
    log.info(`Added ${stats.processedCount} articles to PostgreSQL for content extraction (skipped ${stats.skippedCount})`);
}

