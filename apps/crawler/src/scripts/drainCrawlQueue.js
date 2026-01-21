/**
 * Drain Crawl Queue (local "effective queue" simulation)
 *
 * Goals:
 * - Ingest ALL RSS feed items into crawl requests (repeat until no new items).
 * - Process pending crawl requests until 0 remain.
 * - Reset pending with >=3 attempts and retry until 0.
 * - Reset failed to pending and retry up to 3 rounds.
 * - Print comprehensive stats at the end.
 *
 * Usage:
 *   npm run crawler:drain-queue
 *   npm run crawler:drain-queue -- --batch-size=100 --concurrency=5 --max-feed-passes=5
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
  resetStuckInProgressRequests,
} from '@acta/db';
import { processAndSaveArticle } from '../services/articleService.js';
import { processRSSFeed, setupParser } from '../utils/index.js';

const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    batchSize: 100,
    concurrency: 5,
    maxFeedPasses: 5,
    resetInProgressMinutes: 30,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch-size' && args[i + 1]) {
      parsed.batchSize = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--concurrency' && args[i + 1]) {
      parsed.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--max-feed-passes' && args[i + 1]) {
      parsed.maxFeedPasses = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--reset-in-progress-minutes' && args[i + 1]) {
      parsed.resetInProgressMinutes = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return parsed;
}

function createLogger(prefix) {
  return {
    info: (message) => console.log(`${prefix} ${message}`),
    warning: (message) => console.warn(`${prefix} ${message}`),
    error: (message) => console.error(`${prefix} ${message}`),
  };
}

function normalizeFeedList(outlet) {
  const rssFeedsRaw = outlet.rssFeeds || [];
  const feeds = Array.isArray(rssFeedsRaw)
    ? rssFeedsRaw.map((feed) => {
        if (typeof feed === 'string') {
          return { name: null, url: feed };
        }
        if (feed && typeof feed === 'object') {
          return { name: feed.name || null, url: feed.url || feed.link || null };
        }
        return null;
      })
    : [];

  return feeds.filter((feed) => feed && feed.url);
}

async function loadOutletsFromDb() {
  const outlets = await prisma.outlet.findMany({
    orderBy: { name: 'asc' },
  });

  return outlets
    .map((outlet) => ({
      id: outlet.id,
      name: outlet.name,
      rssFeeds: normalizeFeedList(outlet),
    }))
    .filter((outlet) => outlet.rssFeeds.length > 0);
}

async function fetchFeedBody(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'ActaCrawler/1.0 (+https://acta.news)' },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

async function ingestFeedsOnce(outlets) {
  let detected = 0;
  let stored = 0;
  let skipped = 0;

  for (const outlet of outlets) {
    console.log(`\n📰 ${outlet.name} (${outlet.rssFeeds.length} feeds)`);
    for (const feed of outlet.rssFeeds) {
      const label = feed.name ? `${feed.name}` : feed.url;
      const log = createLogger(`   [${label}]`);
      try {
        const body = await fetchFeedBody(feed.url);
        const $parser = setupParser(undefined, body);
        const stats = await processRSSFeed(
          $parser,
          outlet.name,
          feed.url,
          log,
          () => {},
          outlet.id
        );

        const feedDetected = stats?.detectedCount ?? 0;
        const feedStored = stats?.storedCount ?? 0;
        const feedSkipped = stats?.skippedCount ?? 0;
        detected += feedDetected;
        stored += feedStored;
        skipped += feedSkipped;

        log.info(`Stored ${feedStored} from ${feedDetected} detected (skipped ${feedSkipped})`);
      } catch (error) {
        log.error(`Failed to fetch feed: ${error.message || error}`);
      }
    }
  }

  return { detected, stored, skipped };
}

async function resetPendingOverAttempts() {
  const result = await prisma.crawlRequest.updateMany({
    where: {
      status: CrawlStatus.pending,
      attempts: { gte: MAX_RETRY_ATTEMPTS },
    },
    data: {
      attempts: 0,
      errorMessage: null,
    },
  });
  return result.count;
}

async function resetFailedToPending() {
  const result = await prisma.crawlRequest.updateMany({
    where: { status: CrawlStatus.failed },
    data: {
      status: CrawlStatus.pending,
      attempts: 0,
      errorMessage: null,
    },
  });
  return result.count;
}

async function fetchPendingBatch(limit) {
  return prisma.crawlRequest.findMany({
    where: { status: CrawlStatus.pending },
    include: { outlet: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}

async function runCrawlerBatch(requests, concurrency) {
  if (requests.length === 0) return;

  const crawler = new CheerioCrawler({
    maxConcurrency: concurrency,
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
        log.info(`🔄 Processing: ${request.url}`);
        await updateCrawlRequestStatus(crawlRequestId, CrawlStatus.in_progress);

        await processAndSaveArticle(
          body,
          request.url,
          $,
          outletId,
          crawlRequestId,
          '',
          '',
          '',
          log,
          () => {}
        );

        await updateCrawlRequestStatus(crawlRequestId, CrawlStatus.done);
        log.info(`✅ Successfully processed: ${request.url}`);
      } catch (error) {
        log.error(`❌ Error processing ${request.url}: ${error.message || error}`);
        await updateCrawlRequestStatus(
          crawlRequestId,
          CrawlStatus.failed,
          error.message || 'Unknown error during article processing'
        );
      }
    },
  });

  const crawleeRequests = requests.map((req) => ({
    url: req.url,
    userData: {
      crawlRequestId: req.id,
      outletId: req.outletId,
      outletName: req.outlet?.name,
    },
  }));

  await crawler.run(crawleeRequests);
}

async function drainPendingQueue(batchSize, concurrency, resetInProgressMinutes) {
  let cycles = 0;
  while (true) {
    const pendingCount = await prisma.crawlRequest.count({
      where: { status: CrawlStatus.pending },
    });
    if (pendingCount === 0) break;

    cycles += 1;
    console.log(`\n🔁 Pending cycle ${cycles}: ${pendingCount} pending`);

    const resetPending = await resetPendingOverAttempts();
    if (resetPending > 0) {
      console.log(`   ♻️  Reset ${resetPending} pending with >=${MAX_RETRY_ATTEMPTS} attempts`);
    }

    const stuckReset = await resetStuckInProgressRequests(resetInProgressMinutes);
    if (stuckReset > 0) {
      console.log(`   ♻️  Reset ${stuckReset} stuck in_progress to pending`);
    }

    const batch = await fetchPendingBatch(batchSize);
    if (batch.length === 0) {
      console.log('   ℹ️  No pending batch found (likely reset or race).');
      break;
    }

    console.log(`   🚀 Processing batch of ${batch.length}...`);
    await runCrawlerBatch(batch, concurrency);
  }
}

async function logFinalStats(rssStats) {
  const [pending, inProgress, failed, done] = await Promise.all([
    prisma.crawlRequest.count({ where: { status: CrawlStatus.pending } }),
    prisma.crawlRequest.count({ where: { status: CrawlStatus.in_progress } }),
    prisma.crawlRequest.count({ where: { status: CrawlStatus.failed } }),
    prisma.crawlRequest.count({ where: { status: CrawlStatus.done } }),
  ]);

  const percent =
    rssStats.detected === 0
      ? '0.0'
      : ((rssStats.stored / rssStats.detected) * 100).toFixed(1);

  console.log('\n📊 Final Stats');
  console.log(
    `   RSS ingest: ${rssStats.stored} stored from ${rssStats.detected} detected (${percent}%)`
  );
  console.log(`   pending: ${pending}`);
  console.log(`   in_progress: ${inProgress}`);
  console.log(`   failed: ${failed}`);
  console.log(`   done: ${done}`);
}

async function main() {
  const args = parseArgs();

  console.log('🧹 Draining crawl queue (local effective queue simulation)\n');
  console.log(
    `   batchSize=${args.batchSize} concurrency=${args.concurrency} maxFeedPasses=${args.maxFeedPasses}`
  );

  try {
    await connectDatabase();
    console.log('✅ Database connected\n');

    const outlets = await loadOutletsFromDb();
    if (outlets.length === 0) {
      console.log('⚠️  No outlets with RSS feeds found in database.');
      return;
    }

    let rssStats = { detected: 0, stored: 0, skipped: 0 };
    for (let pass = 1; pass <= args.maxFeedPasses; pass++) {
      console.log(`\n📡 RSS ingest pass ${pass}`);
      const passStats = await ingestFeedsOnce(outlets);
      rssStats.detected += passStats.detected;
      rssStats.stored += passStats.stored;
      rssStats.skipped += passStats.skipped;

      console.log(
        `\n✅ Pass ${pass} summary: ${passStats.stored} stored from ${passStats.detected} detected`
      );

      if (passStats.stored === 0) {
        console.log('ℹ️  No new items discovered in this pass. RSS ingest stabilized.');
        break;
      }
    }

    console.log('\n🧵 Processing pending queue until empty...');
    await drainPendingQueue(
      args.batchSize,
      args.concurrency,
      args.resetInProgressMinutes
    );

    for (let round = 1; round <= 3; round++) {
      const failedCount = await prisma.crawlRequest.count({
        where: { status: CrawlStatus.failed },
      });
      if (failedCount === 0) break;

      console.log(`\n♻️  Failed retry round ${round}: ${failedCount} failed`);
      const resetFailed = await resetFailedToPending();
      console.log(`   ✅ Reset ${resetFailed} failed to pending`);

      await drainPendingQueue(
        args.batchSize,
        args.concurrency,
        args.resetInProgressMinutes
      );
    }

    await logFinalStats(rssStats);
    console.log('\n✅ Drain complete');
  } catch (error) {
    console.error('❌ Error draining crawl queue:', error);
    process.exitCode = 1;
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

export { main as drainCrawlQueue };



