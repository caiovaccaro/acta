// For more information, see https://crawlee.dev/
import { Configuration } from 'crawlee';
import { router } from '../crawlers/articleCrawler.js';
import { enqueuePendingArticles } from '../utils/enqueue.js';
import { createCrawler } from '../crawlers/crawlerFactory.js';
import { logErrorSummary } from '../utils/errorHandler.js';
import { connectDatabase, disconnectDatabase, resetStuckInProgressRequests } from '@acta/db';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the project root .env file
// __dirname: apps/crawler/src/jobs
// Root .env:  /<repo>/.env  -> ../../../../.env from here
config({ path: resolve(__dirname, '../../../../.env') });

// Parse command line arguments for outlet filtering
// Usage: npm run crawler:start -- "BBC"
// Or: npm run crawler:start -- "BBC" "Politico"
const args = process.argv.slice(2);
let outletNames = null;

// Check for --outlets=value format
const outletsEqualArg = args.find(arg => arg.startsWith('--outlets='));
if (outletsEqualArg) {
    outletNames = outletsEqualArg.split('=')[1].split(',').map(name => name.trim());
} else {
    // Check for --outlets followed by values
    const outletsIndex = args.indexOf('--outlets');
    if (outletsIndex !== -1) {
        // Collect all arguments after --outlets until the next -- flag
        outletNames = [];
        for (let i = outletsIndex + 1; i < args.length; i++) {
            if (args[i].startsWith('--')) {
                break;
            }
            outletNames.push(args[i].trim());
        }
        // If no values found, check if it's a quoted string in the next arg
        if (outletNames.length === 0 && outletsIndex + 1 < args.length) {
            const nextArg = args[outletsIndex + 1];
            if (nextArg && !nextArg.startsWith('--')) {
                outletNames = nextArg.split(',').map(name => name.trim());
            }
        }
        // If still empty, set to null
        if (outletNames.length === 0) {
            outletNames = null;
        }
    } else {
        // If --outlets flag is not found, check if there are any non-flag arguments
        // These might be outlet names if npm stripped the --outlets flag
        const nonFlagArgs = args.filter(arg => !arg.startsWith('--'));
        if (nonFlagArgs.length > 0) {
            // Treat all non-flag arguments as outlet names
            outletNames = nonFlagArgs.map(arg => {
                // Handle comma-separated values
                return arg.split(',').map(name => name.trim());
            }).flat();
        }
    }
}

// Connect to database and reset stuck requests
await connectDatabase();
const stuckResetCount = await resetStuckInProgressRequests(60); // Reset requests stuck > 60 minutes
if (stuckResetCount > 0) {
    console.log(`⚠️  Reset ${stuckResetCount} stuck in_progress requests back to pending\n`);
}

// Configure storage directory to persist data (relative to crawler app)
Configuration.getGlobalConfig().set('storageClientOptions', {
    localDataDirectory: resolve(__dirname, '../../storage'),
});

// Load outlet configuration
const outletsPath = resolve(__dirname, '../config/outlets.json');
const outletsConfig = JSON.parse(readFileSync(outletsPath, 'utf-8'));

// Filter to pilot outlets only
let pilotOutlets = outletsConfig.outlets.filter(outlet => outlet.isPilot);

// Filter by outlet names if provided
if (outletNames && outletNames.length > 0) {
    const normalizedOutletNames = outletNames.map(name => name.toLowerCase().trim());
    pilotOutlets = pilotOutlets.filter(outlet => {
        const outletNameLower = outlet.name.toLowerCase();
        return normalizedOutletNames.some(filterName => 
            outletNameLower.includes(filterName) || filterName.includes(outletNameLower)
        );
    });
    
    if (pilotOutlets.length === 0) {
        console.error(`❌ No outlets found matching: ${outletNames.join(', ')}`);
        console.log(`\nAvailable outlets: ${outletsConfig.outlets.filter(o => o.isPilot).map(o => o.name).join(', ')}`);
        await disconnectDatabase();
        process.exit(1);
    }
    
    console.log(`🎯 Filtering to ${pilotOutlets.length} outlet(s): ${pilotOutlets.map(o => o.name).join(', ')}\n`);
}

console.log(`📰 Found ${pilotOutlets.length} pilot outlets to process\n`);

// Phase 1: Process RSS feeds per outlet
console.log('📡 Phase 1: Processing RSS feeds...');

for (const outlet of pilotOutlets) {
    console.log(`\n📰 Processing ${outlet.name} (${outlet.ideology})...`);
    
    // RSS feeds are always public - use CheerioCrawler for all RSS feeds (no authentication needed)
    const { CheerioCrawler } = await import('crawlee');
    const { cheerioRouter } = await import('../crawlers/articleCrawler.js');
    const rssCrawler = new CheerioCrawler({
        requestHandler: cheerioRouter,
        maxRequestsPerCrawl: 100,
        additionalMimeTypes: ['application/rss+xml', 'application/atom+xml'],
        maxConcurrency: Math.min(outlet.rateLimit?.maxRPS || 10, 10),
        requestHandlerTimeoutSecs: 60,
    });
    
    // Support both single rssUrl (backward compatibility) and multiple rssFeeds
    let feedsToProcess = [];
    
    if (outlet.rssFeeds && Array.isArray(outlet.rssFeeds)) {
        // Multiple RSS feeds (new format)
        feedsToProcess = outlet.rssFeeds.map(feed => ({
            url: typeof feed === 'string' ? feed : feed.url,
            name: typeof feed === 'string' ? null : feed.name,
        }));
        console.log(`   Processing ${feedsToProcess.length} RSS feeds...`);
    } else if (outlet.rssUrl) {
        // Single RSS feed (backward compatibility)
        feedsToProcess = [{ url: outlet.rssUrl, name: null }];
    } else {
        console.warn(`⚠️  No RSS feeds configured for ${outlet.name}`);
        continue;
    }
    
    // Create RSS feed requests for all feeds
    const rssRequests = feedsToProcess.map(feed => ({
        url: feed.url,
        label: 'rss',
        userData: {
            source: outlet.name,
            feedUrl: feed.url,
            feedName: feed.name, // Optional feed name for logging
            outletConfig: outlet, // Pass full config for use in handlers
        },
    }));
    
    try {
        await rssCrawler.run(rssRequests);
        console.log(`✅ ${outlet.name} RSS feed(s) processed (${feedsToProcess.length} feed${feedsToProcess.length > 1 ? 's' : ''})`);
    } catch (error) {
        console.error(`❌ Error processing ${outlet.name}:`, error.message);
    }
}

console.log('\n✅ Phase 1 complete: RSS feeds processed\n');

// Phase 2: Process articles (event-driven, decoupled)
console.log('📄 Phase 2: Preparing articles for content extraction...');
// Get outlet IDs for selected outlets if filtering is active
const selectedOutletIds = outletNames && outletNames.length > 0
    ? pilotOutlets.map(o => {
        // We need to get the outlet ID from the database
        // For now, we'll fetch by name in enqueuePendingArticles, but let's get IDs here
        return null; // Will be resolved in enqueuePendingArticles
    })
    : null;

// If outlet filtering is active, get outlet IDs from database
let outletIdsForFiltering = null;
if (outletNames && outletNames.length > 0) {
    const { findOutletByName } = await import('@acta/db');
    outletIdsForFiltering = [];
    for (const outlet of pilotOutlets) {
        const dbOutlet = await findOutletByName(outlet.name);
        if (dbOutlet) {
            outletIdsForFiltering.push(dbOutlet.id);
        }
    }
}

const articleRequests = await enqueuePendingArticles(outletIdsForFiltering);

if (articleRequests.length > 0) {
    // Filter articles by selected outlets if outlet filtering was specified
    let filteredArticleRequests = articleRequests;
    if (outletNames && outletNames.length > 0) {
        const selectedOutletNames = pilotOutlets.map(o => o.name);
        filteredArticleRequests = articleRequests.filter(request => {
            const outletName = request.userData?.source || 'unknown';
            return selectedOutletNames.includes(outletName);
        });
        console.log(`\n📖 Phase 2: Processing ${filteredArticleRequests.length} articles from selected outlets (${filteredArticleRequests.length} of ${articleRequests.length} total)...`);
    } else {
        console.log(`\n📖 Phase 2: Processing ${articleRequests.length} articles...`);
    }
    
    if (filteredArticleRequests.length === 0) {
        console.log('ℹ️  No articles to process from selected outlets');
    } else {
        // Group articles by outlet to use appropriate crawler
        const articlesByOutlet = {};
        
        for (const request of filteredArticleRequests) {
            const outletName = request.userData?.source || 'unknown';
            if (!articlesByOutlet[outletName]) {
                articlesByOutlet[outletName] = [];
            }
            articlesByOutlet[outletName].push(request);
        }
        
        // Process articles per outlet with appropriate crawler
        for (const [outletName, requests] of Object.entries(articlesByOutlet)) {
            // Try to find outlet config - first from pilotOutlets, then from all outlets
            let outlet = pilotOutlets.find(o => o.name === outletName);
            if (!outlet) {
                // Load all outlets to find the config
                const { loadOutlets } = await import('../config/crawlerConfig.js');
                const allOutlets = loadOutlets();
                outlet = allOutlets.find(o => o.name === outletName);
            }
            
            if (!outlet) {
                console.warn(`⚠️  Outlet config not found for ${outletName}, using default crawler`);
                // Use default Cheerio crawler with cheerioRouter
                const { CheerioCrawler } = await import('crawlee');
                const { cheerioRouter } = await import('../crawlers/articleCrawler.js');
                const defaultCrawler = new CheerioCrawler({
                    requestHandler: cheerioRouter,
                    maxRequestsPerCrawl: 100,
                    additionalMimeTypes: ['application/rss+xml', 'application/atom+xml'],
                });
                await defaultCrawler.run(requests);
                continue;
            }
            
            console.log(`\n📰 Processing ${requests.length} articles from ${outlet.name}...`);
            
            // Create crawler for this outlet
            const crawler = createCrawler(outlet, router);
            
            // Use original URLs (all outlets are free, no need for alternative URLs)
            const updatedRequests = requests.map(request => ({
                ...request,
                userData: {
                    ...request.userData,
                    outletConfig: outlet, // Ensure outletConfig is set
                },
            }));
            
            try {
                await crawler.run(updatedRequests);
                console.log(`✅ ${outlet.name} articles processed`);
            } catch (error) {
                console.error(`❌ Error processing ${outlet.name} articles:`, error.message);
            }
        }
        
        console.log('\n✅ Phase 2 complete: Articles processed');
    }
} else {
    console.log('ℹ️  No articles to process');
}

console.log('\n✨ Crawling complete!');

// Log error summary for all outlets
console.log('\n📊 Error Summary:');
logErrorSummary();

// Disconnect from database
await disconnectDatabase();
