import { createCheerioRouter } from 'crawlee';
import { setupParser, processRSSFeed } from '../utils/index.js';
import { processArticle } from '../mappers/articleMapper.js';

export const router = createCheerioRouter();

router.addHandler('rss', async ({ request, $, log, pushData, body }) => {
    const source = request.userData?.source || 'unknown';
    const feedUrl = request.userData?.feedUrl || request.loadedUrl;
    log.info(`Processing RSS feed from ${source}`, { url: feedUrl });

    const $parser = setupParser($, body);
    await processRSSFeed($parser, source, feedUrl, log, pushData);
});

router.addHandler('article', async ({ request, $, log, pushData, body }) => {
    const source = request.userData?.source || 'unknown';
    const rssTitle = request.userData?.rssTitle || '';
    const rssDescription = request.userData?.rssDescription || '';
    const rssPubDate = request.userData?.rssPubDate || '';
    const articleUrl = request.loadedUrl || request.url;
    
    log.info(`Extracting content from article: ${articleUrl.substring(0, 80)}...`);
    
    try {
        await processArticle(
            body || $.html(),
            articleUrl,
            $,
            source,
            rssTitle,
            rssDescription,
            rssPubDate,
            log,
            pushData
        );
    } catch (error) {
        log.error(`❌ Error extracting article ${articleUrl}:`, error.message);
    }
});

router.addDefaultHandler(async ({ request, log }) => {
    log.warning(`No handler for URL: ${request.url}`);
});
