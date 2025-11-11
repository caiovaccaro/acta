/**
 * Article Schema - Based on Mozilla Readability output format
 * This schema ensures consistent structure regardless of extraction method
 */

/**
 * @typedef {Object} ArticleData
 * @property {string} title - Article titleent
 * @property {string} textContent - Plain text version of article content
 * @property {string} excerpt - Article excerpt/summary
 * @property {string} byline - Author name(s)
 * @property {string} dir - Text direction (ltr/rtl)
 * @property {string} lang - Language code
 * @property {number} length - Estimated reading time in words
 * @property {string} siteName - Site/publication name
 * @property {string} publishedTime - ISO 8601 publication date
 * @property {string} modifiedTime - ISO 8601 last modified date
 * @property {string} author - Author name (alternative to byline)
 * @property {string} image - Featured image URL
 * @property {string[]} tags - Article tags/categories
 */

/**
 * Creates an empty article data object with all fields initialized
 * @returns {ArticleData}
 */
export function createEmptyArticleData() {
    return {
        title: '',
        textContent: '',
        excerpt: '',
        byline: '',
        dir: 'ltr',
        lang: 'en',
        length: 0,
        siteName: '',
        publishedTime: '',
        modifiedTime: '',
        author: '',
        image: '',
        tags: [],
    };
}

/**
 * Normalizes article data to ensure all fields are present
 * @param {Partial<ArticleData>} data - Partial article data
 * @returns {ArticleData}
 */
export function normalizeArticleData(data = {}) {
    const normalized = createEmptyArticleData();
    
    return {
        ...normalized,
        ...data,
        // Ensure arrays are arrays
        tags: Array.isArray(data.tags) ? data.tags : [],
        // Ensure strings are strings
        title: String(data.title || ''),
        textContent: String(data.textContent || ''),
        excerpt: String(data.excerpt || ''),
        byline: String(data.byline || ''),
        author: String(data.author || data.byline || ''),
        // Ensure numbers are numbers
        length: Number(data.length || 0),
    };
}

