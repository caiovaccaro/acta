// Mapper functions - only handle data transformation, no database operations

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

// Note: processArticle has been moved to services/articleService.js
// This file now only contains pure mapping/transformation functions

