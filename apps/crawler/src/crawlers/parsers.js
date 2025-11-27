import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as cheerio from 'cheerio';
import { normalizeArticleData } from '../schemas/article.js';

/**
 * Extracts structured article data using Mozilla Readability as primary parser
 * Falls back to generic HTML parsing if Readability fails
 * 
 * @param {string} html - HTML content of the article page
 * @param {string} url - URL of the article (for context)
 * @param {CheerioStatic} $ - Cheerio instance (for fallback parsing)
 * @returns {ArticleData} Normalized article data
 */
export function parseArticle(html, url, $) {
    if (!html || html.length === 0) {
        console.warn(`[Article Parser] Empty HTML for ${url}`);
        return normalizeArticleData({ title: '', textContent: '' });
    }
    
    // Try Readability first
    const readabilityResult = tryReadability(html, url);
    if (readabilityResult && readabilityResult.title && readabilityResult.textContent) {
        console.log(`[Article Parser] Readability succeeded for ${url.substring(0, 80)}`);
        return normalizeArticleData(readabilityResult);
    }
    
    if (readabilityResult) {
        console.warn(`[Article Parser] Readability returned incomplete data for ${url.substring(0, 80)}`);
    } else {
        console.warn(`[Article Parser] Readability failed, using fallback parser for ${url.substring(0, 80)}`);
    }
    
    // Fallback to generic HTML parsing
    const fallbackResult = fallbackParser(html, $);
    console.log(`[Article Parser] Fallback parser result:`, {
        hasTitle: !!fallbackResult.title,
        titleLength: fallbackResult.title?.length || 0,
        hasTextContent: !!fallbackResult.textContent,
        textContentLength: fallbackResult.textContent?.length || 0,
    });
    return normalizeArticleData(fallbackResult);
}

/**
 * Attempts to parse article using Mozilla Readability
 * @param {string} html - HTML content
 * @param {string} url - Article URL
 * @returns {Object|null} Parsed article data or null if failed
 */
function tryReadability(html, url) {
    try {
        const dom = new JSDOM(html, { url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();
        
        if (!article) {
            return null;
        }
        
        // Extract additional metadata from HTML
        const doc = dom.window.document;
        
        return {
            title: article.title || '',
            textContent: article.textContent || '',
            excerpt: article.excerpt || '',
            byline: article.byline || '',
            dir: article.dir || 'ltr',
            lang: article.lang || extractLang(doc),
            length: article.length || 0,
            siteName: extractSiteName(doc),
            publishedTime: extractPublishedTime(doc),
            modifiedTime: extractModifiedTime(doc),
            author: article.byline || extractAuthor(doc),
            image: extractFeaturedImage(doc),
            tags: extractTags(doc),
        };
    } catch (error) {
        console.warn('Readability parsing failed:', error.message);
        return null;
    }
}

/**
 * Fallback parser using generic HTML patterns and meta tags
 * @param {string} html - HTML content
 * @param {CheerioStatic} $ - Cheerio instance
 * @returns {Object} Parsed article data
 */
function fallbackParser(html, $) {
    const doc = $(html);
    
    return {
        title: extractTitle(doc),
        textContent: extractTextContent(doc),
        excerpt: extractExcerpt(doc),
        byline: extractByline(doc),
        dir: 'ltr',
        lang: extractLangFromMeta(doc),
        length: 0, // Will be calculated from textContent
        siteName: extractSiteNameFromMeta(doc),
        publishedTime: extractPublishedTimeFromMeta(doc),
        modifiedTime: extractModifiedTimeFromMeta(doc),
        author: extractAuthorFromMeta(doc),
        image: extractFeaturedImageFromMeta(doc),
        tags: extractTagsFromMeta(doc),
    };
}

// Helper functions for extraction

function extractTitle(doc) {
    return doc.find('h1').first().text().trim() ||
           doc.find('title').text().trim() ||
           doc.find('meta[property="og:title"]').attr('content') || '';
}

function extractTextContent(doc) {
    // Try common article content selectors
    const selectors = [
        'article',
        '[role="article"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        'main article',
        '.content article',
        '.article-body',
        '.story-body',
        '.article-text',
        '[data-module="ArticleBody"]',
        '.article__body',
        'main',
        '.main-content',
    ];
    
    for (const selector of selectors) {
        const content = doc.find(selector).first();
        if (content.length > 0) {
            const text = content.text().trim();
            if (text.length > 100) { // Only return if we got substantial content
                console.log(`[Article Parser] Found content using selector: ${selector} (${text.length} chars)`);
                return text;
            }
        }
    }
    
    // Fallback to body text (but try to exclude navigation, headers, footers)
    const bodyText = doc.find('body').text().trim();
    if (bodyText.length > 100) {
        console.warn(`[Article Parser] Using body text as fallback (${bodyText.length} chars)`);
        return bodyText;
    }
    
    console.warn(`[Article Parser] No substantial content found (body text: ${bodyText.length} chars)`);
    return '';
}

function extractExcerpt(doc) {
    return doc.find('meta[name="description"]').attr('content') ||
           doc.find('meta[property="og:description"]').attr('content') ||
           doc.find('.excerpt').text().trim() ||
           doc.find('.summary').text().trim() || '';
}

function extractByline(doc) {
    return doc.find('.byline').text().trim() ||
           doc.find('.author').text().trim() ||
           doc.find('[rel="author"]').text().trim() || '';
}

function extractLang(doc) {
    return doc.documentElement?.getAttribute('lang') || 'en';
}

function extractLangFromMeta(doc) {
    return doc.find('html').attr('lang') ||
           doc.find('meta[http-equiv="content-language"]').attr('content') || 'en';
}

function extractSiteName(doc) {
    if (doc.querySelector) {
        return doc.querySelector('meta[property="og:site_name"]')?.content || '';
    }
    return '';
}

function extractSiteNameFromMeta(doc) {
    return doc.find('meta[property="og:site_name"]').attr('content') || '';
}

function extractPublishedTime(doc) {
    if (doc.querySelector) {
        return doc.querySelector('time[datetime]')?.getAttribute('datetime') ||
               doc.querySelector('meta[property="article:published_time"]')?.content || '';
    }
    return '';
}

function extractPublishedTimeFromMeta(doc) {
    return doc.find('time[datetime]').first().attr('datetime') ||
           doc.find('meta[property="article:published_time"]').attr('content') ||
           doc.find('meta[name="published_time"]').attr('content') || '';
}

function extractModifiedTime(doc) {
    if (doc.querySelector) {
        return doc.querySelector('meta[property="article:modified_time"]')?.content || '';
    }
    return '';
}

function extractModifiedTimeFromMeta(doc) {
    return doc.find('meta[property="article:modified_time"]').attr('content') || '';
}

function extractAuthor(doc) {
    if (doc.querySelector) {
        return doc.querySelector('meta[name="author"]')?.content ||
               doc.querySelector('[rel="author"]')?.textContent?.trim() || '';
    }
    return '';
}

function extractAuthorFromMeta(doc) {
    return doc.find('meta[name="author"]').attr('content') ||
           doc.find('[rel="author"]').text().trim() || '';
}

function extractFeaturedImage(doc) {
    if (doc.querySelector) {
        return doc.querySelector('meta[property="og:image"]')?.content ||
               doc.querySelector('meta[name="twitter:image"]')?.content ||
               doc.querySelector('article img')?.src || '';
    }
    return '';
}

function extractFeaturedImageFromMeta(doc) {
    return doc.find('meta[property="og:image"]').attr('content') ||
           doc.find('meta[name="twitter:image"]').attr('content') ||
           doc.find('article img').first().attr('src') || '';
}

function extractTags(doc) {
    const tags = [];
    
    if (doc.querySelector) {
        // Try JSON-LD
        const jsonLd = doc.querySelector('script[type="application/ld+json"]');
        if (jsonLd) {
            try {
                const data = JSON.parse(jsonLd.textContent);
                if (data.keywords) {
                    tags.push(...(Array.isArray(data.keywords) ? data.keywords : [data.keywords]));
                }
            } catch (e) {
                // Ignore JSON parse errors
            }
        }
        
        // Try meta tags
        const metaKeywords = doc.querySelector('meta[name="keywords"]')?.content;
        if (metaKeywords) {
            tags.push(...metaKeywords.split(',').map(t => t.trim()));
        }
        
        // Try article tags
        const articleTags = Array.from(doc.querySelectorAll('.tags a, .categories a, [rel="tag"]'));
        articleTags.forEach(tag => {
            const text = tag.textContent?.trim();
            if (text) tags.push(text);
        });
    }
    
    return [...new Set(tags)]; // Remove duplicates
}

function extractTagsFromMeta(doc) {
    const tags = [];
    
    // Meta keywords
    const keywords = doc.find('meta[name="keywords"]').attr('content');
    if (keywords) {
        tags.push(...keywords.split(',').map(t => t.trim()));
    }
    
    // Article tags
    doc.find('.tags a, .categories a, [rel="tag"]').each((i, el) => {
        const text = doc(el).text().trim();
        if (text) tags.push(text);
    });
    
    return [...new Set(tags)];
}

