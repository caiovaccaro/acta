/**
 * Article Service
 * Handles article processing business logic (parsing, validation, database operations)
 * Separated from mapper which only handles data transformation
 */

import { parseArticle } from '../crawlers/parsers.js';
import { 
    createOrUpdateArticle,
    updateCrawlRequestStatus,
    CrawlStatus,
    findCrawlRequestById,
} from '@acta/db';
import { combineArticleData, calculateWordCount } from '../mappers/articleMapper.js';

/**
 * Processes and saves an article to PostgreSQL
 * Note: HTML is only used for parsing/extraction - only textContent is stored, never HTML
 * @param {string} html - HTML content (used only for parsing, not stored)
 * @param {string} articleUrl - Article URL
 * @param {Function} $ - Cheerio instance
 * @param {string} outletId - Outlet ID from database
 * @param {string} crawlRequestId - CrawlRequest ID (optional)
 * @param {string} rssTitle - Title from RSS feed (optional)
 * @param {string} rssDescription - Description from RSS feed (optional)
 * @param {string} rssPubDate - Publication date from RSS feed (optional)
 * @param {Object} log - Logger instance
 * @param {Function} pushData - Data push function (optional, no-op if not provided)
 * @returns {Promise<Object>} Created/updated article
 */
export async function processAndSaveArticle(
    html, 
    articleUrl, 
    $, 
    outletId,
    crawlRequestId = null,
    rssTitle = '',
    rssDescription = '',
    rssPubDate = '',
    log,
    pushData
) {
    try {
        // Parse article using agnostic parser
        // This extracts textContent from HTML - HTML is discarded, only text is kept
        const articleData = parseArticle(html, articleUrl, $);
        
        // Log what was extracted for debugging
        log.debug(`[Article Parser] Extracted data:`, {
            hasTitle: !!articleData.title,
            titleLength: articleData.title?.length || 0,
            hasTextContent: !!articleData.textContent,
            textContentLength: articleData.textContent?.length || 0,
            titlePreview: articleData.title?.substring(0, 100) || 'N/A',
        });
        
        // Use RSS title as fallback if parser didn't extract title
        if (!articleData.title && rssTitle) {
            log.warn(`Parser didn't extract title, using RSS title: ${rssTitle.substring(0, 100)}`);
            articleData.title = rssTitle;
        }
        
        // Validate required fields
        if (!articleData.title || !articleData.textContent) {
            const errorDetails = {
                title: articleData.title || 'MISSING',
                textContent: articleData.textContent ? `${articleData.textContent.substring(0, 200)}...` : 'MISSING',
                titleLength: articleData.title?.length || 0,
                textContentLength: articleData.textContent?.length || 0,
                rssTitle: rssTitle || 'N/A',
                htmlLength: html?.length || 0,
            };
            log.error(`[Article Parser] Missing required fields:`, errorDetails);
            throw new Error(`Missing required article fields: title or textContent. Title: ${articleData.title ? 'present' : 'missing'}, TextContent: ${articleData.textContent ? 'present' : 'missing'}`);
        }
        
        // Parse published date if available
        let publishedDate = null;
        if (rssPubDate) {
            const parsedDate = new Date(rssPubDate);
            if (!isNaN(parsedDate.getTime())) {
                publishedDate = parsedDate;
            }
        } else if (articleData.publishedTime) {
            const parsedDate = new Date(articleData.publishedTime);
            if (!isNaN(parsedDate.getTime())) {
                publishedDate = parsedDate;
            }
        }
        
        // Create or update article in PostgreSQL
        const article = await createOrUpdateArticle({
            url: articleUrl,
            crawlRequestId: crawlRequestId,
            outletId: outletId,
            title: articleData.title,
            textContent: articleData.textContent,
            excerpt: rssDescription || articleData.excerpt || null,
            publishedDate: publishedDate,
        });
        
        // Update crawl request status to done
        if (crawlRequestId) {
            await updateCrawlRequestStatus(crawlRequestId, CrawlStatus.done);
        }
        
        // Combine RSS metadata with extracted content (for backward compatibility)
        let fullArticleData = combineArticleData(
            articleData,
            '', // source not needed for DB
            rssTitle,
            rssDescription,
            rssPubDate,
            articleUrl
        );
        
        // Calculate word count if not provided
        fullArticleData = calculateWordCount(fullArticleData);
        
        // Save article data to Crawlee storage (for backward compatibility with export scripts)
        if (pushData) {
            await pushData(fullArticleData);
        }
        
        log.info(`✅ Extracted and saved article: ${articleData.title.substring(0, 60)}...`);
        
        return article;
    } catch (error) {
        log.error(`❌ Error processing article ${articleUrl}:`, error.message);
        
        // Update crawl request status to failed if we have a crawlRequestId
        if (crawlRequestId) {
            try {
                await updateCrawlRequestStatus(
                    crawlRequestId,
                    CrawlStatus.failed,
                    error.message || 'Unknown error during article processing'
                );
            } catch (updateError) {
                log.error(`Failed to update crawl request status:`, updateError);
            }
        }
        
        throw error;
    }
}

/**
 * Gets outlet ID from crawl request if not provided
 * @param {string} crawlRequestId - CrawlRequest ID
 * @returns {Promise<string|null>} Outlet ID or null
 */
export async function getOutletIdFromCrawlRequest(crawlRequestId) {
    if (!crawlRequestId) {
        return null;
    }
    
    const crawlRequest = await findCrawlRequestById(crawlRequestId);
    return crawlRequest?.outletId || null;
}

