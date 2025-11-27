import { createCheerioRouter } from 'crawlee';
import { setupParser, processRSSFeed } from '../utils/index.js';
import { processArticle } from '../mappers/articleMapper.js';
import { recordError, recordSuccess, tagError, ERROR_TYPES } from '../utils/errorHandler.js';

// Create router for Cheerio only
export const cheerioRouter = createCheerioRouter();

// Unified router interface (for compatibility)
export const router = {
    addHandler: (label, handler) => {
        cheerioRouter.addHandler(label, handler);
    },
    addDefaultHandler: (handler) => {
        cheerioRouter.addDefaultHandler(handler);
    },
};

// RSS handler (Cheerio only)
const rssHandler = async (context) => {
    const { request, log, pushData } = context;
    const source = request.userData?.source || 'unknown';
    const outletConfig = request.userData?.outletConfig;
    const feedUrl = request.userData?.feedUrl || request.loadedUrl;
    
    log.info(`Processing RSS feed from ${source}`, { url: feedUrl });

    // Get body content - for RSS/XML feeds, we need to load it manually with Cheerio
    // CheerioCrawler may not automatically parse XML, so context.$ might be undefined
    let body = context.body;
    
    // Convert body to string if it's a Buffer or other type
    if (body && typeof body !== 'string') {
        if (Buffer.isBuffer(body)) {
            body = body.toString('utf-8');
        } else if (typeof body.toString === 'function') {
            body = body.toString();
        } else {
            body = String(body);
        }
    }
    
    // If body is not available, try to get it from context.$
    if (!body && context.$) {
        body = context.$.html() || context.body;
        if (body && typeof body !== 'string') {
            body = String(body);
        }
    }
    
    // If still no body, try response body
    if (!body && context.response) {
        body = await context.response.text().catch(() => null);
    }
    
    // Debug: Log feed content info
    if (!body || (typeof body === 'string' && body.length === 0)) {
        log.error(`RSS feed body is empty for ${source}: ${feedUrl}`);
        log.error(`Context keys: ${Object.keys(context).join(', ')}`);
        if (context.response) {
            log.error(`Response status: ${context.response.status}, Content-Type: ${context.response.headers()?.['content-type']}`);
        }
        return;
    }
    
    // Ensure body is a string
    if (typeof body !== 'string') {
        body = String(body);
    }
    
    log.info(`RSS feed body length: ${body.length} chars`);
    
    // Check if body contains RSS/Atom indicators
    const bodyLower = body.toLowerCase();
    const hasRss = bodyLower.includes('<rss') || bodyLower.includes('<feed');
    const hasItems = bodyLower.includes('<item') || bodyLower.includes('<entry');
    log.info(`RSS feed indicators: hasRSS=${hasRss}, hasItems=${hasItems}`);

    // Load body with Cheerio in XML mode (context.$ might not be available for XML)
    const cheerio = await import('cheerio');
    const $parser = cheerio.load(body, { xmlMode: true });
    
    // Debug: Check if parser can find items
    const itemCount = $parser('item').length;
    const entryCount = $parser('entry').length;
    log.info(`Parser found ${itemCount} <item> elements and ${entryCount} <entry> elements`);
    
    // Get outlet ID from database using outlet name
    let outletId = null;
    if (outletConfig?.name) {
        const { findOrCreateOutlet, Ideology } = await import('@acta/db');
        // Map ideology string to enum
        const ideologyMap = {
            'Left': Ideology.Left,
            'Center': Ideology.Center,
            'Right': Ideology.Right,
        };
        const ideology = ideologyMap[outletConfig.ideology] || Ideology.Center;
        
        // Collect all RSS feed URLs (support both rssFeeds array and rssUrl for backward compatibility)
        let rssFeedUrls = [];
        if (outletConfig.rssFeeds && Array.isArray(outletConfig.rssFeeds)) {
            // Multiple RSS feeds (new format)
            rssFeedUrls = outletConfig.rssFeeds.map(feed => 
                typeof feed === 'string' ? feed : feed.url
            );
        } else if (outletConfig.rssUrl) {
            // Single RSS feed (backward compatibility)
            rssFeedUrls = [outletConfig.rssUrl];
        }
        
        const outlet = await findOrCreateOutlet(
            outletConfig.name,
            ideology,
            0.5, // default credibility
            rssFeedUrls
        );
        outletId = outlet.id;
        log.info(`Outlet ID for ${outletConfig.name}: ${outletId}`);
    } else {
        log.error(`No outletConfig or outletConfig.name for source: ${source}`);
    }
    
    if (!outletId) {
        log.error(`Cannot process RSS feed - outletId is null for ${source}`);
        return;
    }
    
    await processRSSFeed($parser, source, feedUrl, log, pushData, outletId);
};

// Article handler (Cheerio only)
const articleHandler = async (context) => {
    const { request, log, pushData } = context;
    const crawlRequestId = request.userData?.crawlRequestId || null;
    
    // Wrap entire handler in try-catch to ensure errors are marked as failed
    try {
        const source = request.userData?.source || 'unknown';
        const outletConfig = request.userData?.outletConfig;
        const outletId = request.userData?.outletId;
    const rssTitle = request.userData?.rssTitle || '';
    const rssDescription = request.userData?.rssDescription || '';
    const rssPubDate = request.userData?.rssPubDate || '';
    const articleUrl = context.loadedUrl || request.url;
    
    log.info(`Extracting content from article: ${articleUrl.substring(0, 80)}...`);
    
    // Get outlet ID - either from outletConfig or userData
    let finalOutletId = outletId;
    if (!finalOutletId && outletConfig) {
        // Look up outlet from database if we have outletConfig but no outletId
        const { findOrCreateOutlet, Ideology } = await import('@acta/db');
        const ideologyMap = {
            'Left': Ideology.Left,
            'Center': Ideology.Center,
            'Right': Ideology.Right,
        };
        const ideology = ideologyMap[outletConfig.ideology] || Ideology.Center;
        const outlet = await findOrCreateOutlet(
            outletConfig.name,
            ideology,
            0.5,
            outletConfig.rssUrl ? [outletConfig.rssUrl] : []
        );
        finalOutletId = outlet.id;
    }
    
    if (!finalOutletId) {
        log.error(`No outlet ID available for article: ${articleUrl}`);
        // Mark as failed if we have a crawlRequestId
        if (crawlRequestId) {
            try {
                const { updateCrawlRequestStatus, CrawlStatus } = await import('@acta/db');
                await updateCrawlRequestStatus(
                    crawlRequestId,
                    CrawlStatus.failed,
                    'No outlet ID available for article'
                );
                log.error(`Marked crawl request ${crawlRequestId} as failed - no outlet ID`);
            } catch (updateError) {
                log.error(`Failed to update crawl request status: ${updateError.message}`);
            }
        }
        return;
    }
    
    // Get body content and parser from Cheerio context
    if (!context.$) {
        log.error('No Cheerio parser available for article');
        // Mark as failed if we have a crawlRequestId
        if (crawlRequestId) {
            try {
                const { updateCrawlRequestStatus, CrawlStatus } = await import('@acta/db');
                await updateCrawlRequestStatus(
                    crawlRequestId,
                    CrawlStatus.failed,
                    'No Cheerio parser available for article'
                );
                log.error(`Marked crawl request ${crawlRequestId} as failed - no parser available`);
            } catch (updateError) {
                log.error(`Failed to update crawl request status: ${updateError.message}`);
            }
        }
        return;
    }
    
    const $ = context.$;
    const body = context.body || $.html();
    
    // Process the article
    const startTime = Date.now();
    try {
        // Use PostgreSQL service instead of old file-based mapper
        const { processAndSaveArticle } = await import('../services/articleService.js');
        await processAndSaveArticle(
            body,
            articleUrl,
            $,
            finalOutletId,
            crawlRequestId,
            rssTitle,
            rssDescription,
            rssPubDate,
            log,
            pushData
        );
        const latency = Date.now() - startTime;
        recordSuccess(source, 'article', latency);
        log.info(`✅ Successfully processed article from ${source}`);
    } catch (error) {
        const errorType = tagError(error);
        recordError(source, errorType, error, {
            operation: 'article_processing',
            articleUrl,
        });
        log.error(`❌ Error extracting article ${articleUrl}:`, error.message);
        
        // Update crawl request status to failed if we have a crawlRequestId
        if (crawlRequestId) {
            try {
                const { updateCrawlRequestStatus, CrawlStatus } = await import('@acta/db');
                await updateCrawlRequestStatus(
                    crawlRequestId,
                    CrawlStatus.failed,
                    error.message || 'Unknown error during article processing'
                );
            } catch (updateError) {
                log.error(`Failed to update crawl request status: ${updateError.message}`);
            }
        }
        
    }
    } catch (outerError) {
        // Catch any unhandled errors that occur outside the inner try-catch
        // This ensures the request is always marked as failed if something goes wrong
        log.error(`❌ Unhandled error in article handler: ${outerError.message}`, outerError);
        
        if (crawlRequestId) {
            try {
                const { updateCrawlRequestStatus, CrawlStatus } = await import('@acta/db');
                await updateCrawlRequestStatus(
                    crawlRequestId,
                    CrawlStatus.failed,
                    `Unhandled error in article handler: ${outerError.message || 'Unknown error'}`
                );
                log.error(`Marked crawl request ${crawlRequestId} as failed due to unhandled error`);
            } catch (updateError) {
                log.error(`Failed to update crawl request status for unhandled error: ${updateError.message}`);
            }
        }
        
        // Re-throw to let Crawlee handle it
        throw outerError;
    }
};

// Default handler
const defaultHandler = async ({ request, log }) => {
    log.warning(`No handler for URL: ${request.url}`);
};

// Register handlers
router.addHandler('rss', rssHandler);
router.addHandler('article', articleHandler);
router.addDefaultHandler(defaultHandler);
