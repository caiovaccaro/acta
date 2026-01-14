/**
 * Crawl In-Progress Requests (Stuck)
 *
 * Re-processes crawl requests that are stuck in_progress.
 * Uses updatedAt age to avoid interfering with active crawls.
 *
 * Usage:
 *   npm run crawler:crawl-in-progress
 *   npm run crawler:crawl-in-progress -- --outlet-id=<outlet-id>
 *   npm run crawler:crawl-in-progress -- --limit=50
 *   npm run crawler:crawl-in-progress -- --min-minutes=30
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { CheerioCrawler } from 'crawlee';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  CrawlStatus,
  updateCrawlRequestStatus,
} from '@acta/db';
import { processAndSaveArticle } from '../services/articleService.js';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    outletId: null,
    limit: null,
    minMinutes: 30,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--outlet-id' && args[i + 1]) {
      parsed.outletId = args[i + 1];
      i++;
    } else if (args[i] === '--limit' && args[i + 1]) {
      parsed.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-minutes' && args[i + 1]) {
      parsed.minMinutes = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();
  const cutoff = new Date(Date.now() - args.minMinutes * 60 * 1000);

  console.log(`🕷️  Crawling in_progress requests older than ${args.minMinutes} minutes...\n`);

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    const whereClause = {
      status: CrawlStatus.in_progress,
      updatedAt: { lt: cutoff },
    };

    if (args.outletId) {
      whereClause.outletId = args.outletId;
      console.log(`📰 Filtering by outlet: ${args.outletId}\n`);
    }

    const requests = await prisma.crawlRequest.findMany({
      where: whereClause,
      include: {
        outlet: true,
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: args.limit || 100,
    });

    if (requests.length === 0) {
      console.log(`ℹ️  No in_progress crawl requests found older than ${args.minMinutes} minutes`);
      if (args.outletId) {
        console.log(`   (filtered by outlet: ${args.outletId})`);
      }
      return;
    }

    console.log(`📊 Found ${requests.length} in_progress crawl request(s) older than ${args.minMinutes} minutes\n`);

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

        if (!outletId) {
          log.error(`❌ Outlet ID missing for request: ${request.url}`);
          await updateCrawlRequestStatus(
            crawlRequestId,
            CrawlStatus.failed,
            'Outlet ID missing'
          );
          return;
        }

        try {
          log.info(`🔄 Re-processing: ${request.url}`);

          // Keep status in_progress while reprocessing
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

    const crawleeRequests = requests.map(req => ({
      url: req.url,
      userData: {
        crawlRequestId: req.id,
        outletId: req.outletId,
        outletName: req.outlet.name,
      },
    }));

    console.log(`🚀 Starting to crawl ${crawleeRequests.length} request(s)...\n`);
    await crawler.run(crawleeRequests);

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
    console.error('❌ Error crawling in_progress requests:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main as crawlInProgressRequestsScript };

