/**
 * Crawl Pending Requests with 3+ Attempts
 * 
 * Immediately processes pending crawl requests that have 3+ attempts.
 * These requests are stuck because the crawler filters them out (only processes attempts < 3).
 * 
 * This script directly crawls them without resetting attempts or changing status beforehand.
 * Status will naturally change during processing (in_progress -> done/failed).
 * 
 * Usage:
 *   npm run crawler:crawl-pending
 *   npm run crawler:crawl-pending -- --outlet-id=<outlet-id>
 *   npm run crawler:crawl-pending -- --limit=10  # Process only N requests
 *   npm run crawler:crawl-pending -- --min-attempts=3  # Minimum attempts (default: 3)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { CheerioCrawler } from 'crawlee';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  CrawlStatus,
  MAX_RETRY_ATTEMPTS,
  updateCrawlRequestStatus,
} from '@acta/db';
import { processAndSaveArticle } from '../services/articleService.js';
import { loadOutlets } from '../config/crawlerConfig.js';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    outletId: null,
    limit: null,
    minAttempts: MAX_RETRY_ATTEMPTS,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--outlet-id' && args[i + 1]) {
      parsed.outletId = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      parsed.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-attempts' && args[i + 1]) {
      parsed.minAttempts = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();

  console.log('🕷️  Crawling Pending Requests with 3+ Attempts...\n');

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    const whereClause = {
      status: CrawlStatus.pending,
      attempts: {
        gte: args.minAttempts,
      },
    };

    if (args.outletId) {
      whereClause.outletId = args.outletId;
      console.log(`📰 Filtering by outlet: ${args.outletId}\n`);
    }

    // Find pending requests with 3+ attempts
    const requests = await prisma.crawlRequest.findMany({
      where: whereClause,
      include: {
        outlet: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: args.limit || 100,
    });

    if (requests.length === 0) {
      console.log(`ℹ️  No pending crawl requests found with ${args.minAttempts}+ attempts`);
      if (args.outletId) {
        console.log(`   (filtered by outlet: ${args.outletId})`);
      }
      return;
    }

    console.log(`📊 Found ${requests.length} pending crawl request(s) with ${args.minAttempts}+ attempts\n`);

    // Show breakdown by outlet
    const outletCounts = new Map();
    for (const req of requests) {
      const name = req.outlet.name;
      outletCounts.set(name, (outletCounts.get(name) || 0) + 1);
    }

    if (outletCounts.size > 0) {
      console.log('   By outlet:');
      for (const [name, count] of Array.from(outletCounts.entries()).sort()) {
        console.log(`      - ${name}: ${count}`);
      }
      console.log('');
    }

    // Create a crawler to process these requests
    const crawler = new CheerioCrawler({
      maxConcurrency: 5,
      requestHandler: async ({ request, $, body, log }) => {
        const crawlRequestId = request.userData.crawlRequestId;
        const outletId = request.userData.outletId;
        const outletName = request.userData.outletName;

        if (!outletId) {
          log.error(`❌ Outlet ID missing for request: ${request.url}`);
          await updateCrawlRequestStatus(
            crawlRequestId,
            CrawlStatus.failed,
            `Outlet ID missing`
          );
          return;
        }

        try {
          log.info(`🔄 Processing: ${request.url}`);

          // Mark as in_progress (status change is natural during processing)
          await updateCrawlRequestStatus(crawlRequestId, CrawlStatus.in_progress);

          // Process and save article
          await processAndSaveArticle(
            body,
            request.url,
            $,
            outletId,
            crawlRequestId,
            '', // rssTitle
            '', // rssDescription
            '', // rssPubDate
            log,
            () => {} // pushData (no-op)
          );

          // Mark as done (status change is natural during processing)
          await updateCrawlRequestStatus(crawlRequestId, CrawlStatus.done);
          log.info(`✅ Successfully processed: ${request.url}`);

        } catch (error) {
          log.error(`❌ Error processing ${request.url}:`, error.message);
          await updateCrawlRequestStatus(
            crawlRequestId,
            CrawlStatus.failed,
            error.message || 'Unknown error during article processing'
          );
        }
      },
    });

    // Convert crawl requests to Crawlee requests
    const crawleeRequests = requests.map(req => ({
      url: req.url,
      userData: {
        crawlRequestId: req.id,
        outletId: req.outletId,
        outletName: req.outlet.name,
      },
    }));

    console.log(`🚀 Starting to crawl ${crawleeRequests.length} request(s)...\n`);

    // Run the crawler
    await crawler.run(crawleeRequests);

    // Get final stats
    const stats = await prisma.crawlRequest.groupBy({
      by: ['status'],
      where: {
        id: { in: requests.map(r => r.id) },
      },
      _count: true,
    });

    console.log('\n📊 Final Status:');
    for (const stat of stats) {
      console.log(`   ${stat.status}: ${stat._count}`);
    }

    console.log('\n✅ Crawling complete!');

  } catch (error) {
    console.error('❌ Error crawling pending requests:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as crawlPendingRequestsScript };

