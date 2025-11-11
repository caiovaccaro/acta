import { parseArticle } from '../crawlers/parsers.js';
import { markArticleAsProcessed } from '../utils/index.js';

/**
 * Combines RSS metadata with extracted article content
 * @param {Object} articleData - Parsed article data
 * @param {string} source - News source name
 * @param {string} rssTitle - Title from RSS feed
 * @param {string} rssDescription - Description from RSS feed
 * @param {string} rssPubDate - Publication date from RSS feed
 * @param {string} articleUrl - Article URL
 * @returns {Object} Combined article data
 */
export function combineArticleData(articleData, source, rssTitle, rssDescription, rssPubDate, articleUrl) {
    return {
        // RSS feed metadata
        source,
        feedUrl: '', // Will be set if available
        rssTitle: rssTitle || articleData.title,
        rssDescription: rssDescription || articleData.excerpt,
        rssPubDate: rssPubDate || articleData.publishedTime,
        
        // Extracted article content
        ...articleData,
        
        // Additional metadata
        articleUrl,
        extractedAt: new Date().toISOString(),
    };
}

/**
 * Calculates word count from text content
 * @param {Object} articleData - Article data object
 * @returns {Object} Article data with calculated length
 */
export function calculateWordCount(articleData) {
    if (!articleData.length && articleData.textContent) {
        articleData.length = articleData.textContent.split(/\s+/).length;
    }
    return articleData;
}

/**
 * Processes and saves an article
 * @param {string} html - HTML content
 * @param {string} articleUrl - Article URL
 * @param {Function} $ - Cheerio instance
 * @param {string} source - News source name
 * @param {string} rssTitle - Title from RSS feed
 * @param {string} rssDescription - Description from RSS feed
 * @param {string} rssPubDate - Publication date from RSS feed
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function
 */
export async function processArticle(html, articleUrl, $, source, rssTitle, rssDescription, rssPubDate, log, pushData) {
    // Parse article using agnostic parser
    const articleData = parseArticle(html, articleUrl, $);
    
    // Combine RSS metadata with extracted content
    let fullArticleData = combineArticleData(
        articleData,
        source,
        rssTitle,
        rssDescription,
        rssPubDate,
        articleUrl
    );
    
    // Calculate word count if not provided
    fullArticleData = calculateWordCount(fullArticleData);
    
    // Save article data
    await pushData(fullArticleData);
    
    // Mark article as processed
    await markArticleAsProcessed(articleUrl);
    
    log.info(`✅ Extracted article: ${articleData.title.substring(0, 60)}...`);
}

