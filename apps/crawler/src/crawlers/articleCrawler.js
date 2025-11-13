import { createCheerioRouter } from 'crawlee';
import { setupParser, processRSSFeed } from '../utils/index.js';
import { processAndSaveArticle, getOutletIdFromCrawlRequest } from '../services/articleService.js';

export const router = createCheerioRouter();

router.addHandler('rss', async ({ request, $, log, pushData, body }) => {
    const source = request.userData?.source || 'unknown';
    const feedUrl = request.userData?.feedUrl || request.loadedUrl;
    log.info(`Processing RSS feed from ${source}`, { url: feedUrl });

    const $parser = setupParser($, body);
    await processRSSFeed($parser, source, feedUrl, log, pushData);
});

router.addHandler('article', async ({ request, $, log, pushData, body }) => {
    const crawlRequestId = request.userData?.crawlRequestId || null;
    const outletId = request.userData?.outletId || null;
    const rssTitle = request.userData?.rssTitle || '';
    const rssDescription = request.userData?.rssDescription || '';
    const rssPubDate = request.userData?.rssPubDate || '';
    const articleUrl = request.loadedUrl || request.url;
    
    log.info(`Extracting content from article: ${articleUrl.substring(0, 80)}...`);
    
    // Get outletId if not provided (from crawl request)
    let actualOutletId = outletId;
    if (!actualOutletId && crawlRequestId) {
        try {
            actualOutletId = await getOutletIdFromCrawlRequest(crawlRequestId);
        } catch (error) {
            log.error(`Failed to fetch outlet from crawl request:`, error);
        }
    }
    
    if (!actualOutletId) {
        log.error(`❌ Missing outletId for article ${articleUrl}`);
        return;
    }
    
    try {
        await processAndSaveArticle(
            body || $.html(),
            articleUrl,
            $,
            actualOutletId,
            crawlRequestId,
            rssTitle,
            rssDescription,
            rssPubDate,
            log,
            pushData
        );
    } catch (error) {
        log.error(`❌ Error extracting article ${articleUrl}:`, error.message);
        // Error handling is done in processAndSaveArticle
    }
});

router.addDefaultHandler(async ({ request, log }) => {
    log.warning(`No handler for URL: ${request.url}`);
});
