// For more information, see https://crawlee.dev/
import { CheerioCrawler, Configuration } from 'crawlee';
import { router } from './routes.js';
import { enqueuePendingArticles } from './utils/enqueue.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Configure storage directory to persist data
Configuration.getGlobalConfig().set('storageClientOptions', {
    localDataDirectory: resolve(process.cwd(), 'storage'),
});

// Load verified RSS feeds
const verifiedFeeds = JSON.parse(readFileSync('./verified-rss-feeds.json', 'utf-8'));

// Create requests for verified RSS feeds
const rssUrls = verifiedFeeds.validFeeds.map(feed => ({
    url: feed.url,
    label: 'rss',
    userData: { 
        source: feed.source,
        feedUrl: feed.url
    }
}));

const crawler = new CheerioCrawler({
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
    requestHandler: router,
    // Comment this option to scrape the full website.
    maxRequestsPerCrawl: 100,
    // Allow RSS and Atom feed content types
    additionalMimeTypes: ['application/rss+xml', 'application/atom+xml'],
});

// Phase 1: Process RSS feeds
console.log('📡 Phase 1: Processing RSS feeds...');
await crawler.run(rssUrls);
console.log('✅ Phase 1 complete: RSS feeds processed\n');

// Phase 2: Process articles (event-driven, decoupled)
console.log('📄 Phase 2: Preparing articles for content extraction...');
const articleRequests = await enqueuePendingArticles();

if (articleRequests.length > 0) {
    console.log(`\n📖 Phase 2: Processing ${articleRequests.length} articles...`);
    // Run crawler with the article requests directly
    await crawler.run(articleRequests);
    console.log('✅ Phase 2 complete: Articles processed');
} else {
    console.log('ℹ️  No articles to process');
}

console.log('\n✨ Crawling complete!');
