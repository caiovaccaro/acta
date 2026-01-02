/**
 * Retry Failed Crawl Requests
 * 
 * Resets crawl requests that have failed 3+ times OR are stuck in pending with 3+ attempts
 * back to pending status (with reset attempts) so they can be retried by the crawler.
 * 
 * The crawler only processes pending requests with attempts < 3, so requests with 3+ attempts
 * are stuck and won't be retried automatically.
 * 
 * Usage:
 *   npm run db:retry:failed-crawls
 *   npm run db:retry:failed-crawls -- --outlet-id=<outlet-id>
 *   npm run db:retry:failed-crawls -- --reset-attempts  # Reset attempts counter to 0 (default behavior)
 *   npm run db:retry:failed-crawls -- --keep-attempts   # Keep attempts counter (not recommended)
 *   npm run db:retry:failed-crawls -- --min-attempts=3  # Only retry requests with at least N attempts
 *   npm run db:retry:failed-crawls -- --status=failed  # Only retry failed requests (not pending)
 *   npm run db:retry:failed-crawls -- --status=pending # Only retry pending requests (not failed)
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  CrawlStatus,
  MAX_RETRY_ATTEMPTS,
} from '@acta/db';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  outletId?: string;
  resetAttempts?: boolean; // Reset attempts counter to 0 (default: true)
  keepAttempts?: boolean; // Keep attempts counter (overrides resetAttempts)
  minAttempts?: number; // Minimum attempts to retry (default: MAX_RETRY_ATTEMPTS)
  status?: 'failed' | 'pending' | 'both'; // Which status to retry (default: 'both')
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'outlet-id': { type: 'string' },
      'reset-attempts': { type: 'boolean' },
      'min-attempts': { type: 'string' },
    },
  });

  return {
    outletId: values['outlet-id'],
    resetAttempts: values['reset-attempts'] || false,
    minAttempts: values['min-attempts'] ? parseInt(values['min-attempts'], 10) : undefined,
  };
}

async function main() {
  const args = parseScriptArgs();

  console.log('🔄 Retrying Failed Crawl Requests...\n');

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    const minAttempts = args.minAttempts ?? MAX_RETRY_ATTEMPTS;
    const whereClause: any = {
      status: CrawlStatus.failed,
      attempts: {
        gte: minAttempts,
      },
    };

    if (args.outletId) {
      whereClause.outletId = args.outletId;
      console.log(`📰 Filtering by outlet: ${args.outletId}\n`);
    }

    // Count failed requests that match criteria
    const failedCount = await prisma.crawlRequest.count({
      where: whereClause,
    });

    if (failedCount === 0) {
      console.log(`ℹ️  No failed crawl requests found with ${minAttempts}+ attempts`);
      if (args.outletId) {
        console.log(`   (filtered by outlet: ${args.outletId})`);
      }
      return;
    }

    console.log(`📊 Found ${failedCount} failed crawl request(s) with ${minAttempts}+ attempts\n`);

    // Show breakdown by outlet if not filtering
    if (!args.outletId) {
      const breakdown = await prisma.crawlRequest.groupBy({
        by: ['outletId'],
        where: whereClause,
        _count: true,
      });

      if (breakdown.length > 0) {
        console.log('   By outlet:');
        for (const group of breakdown) {
          const outlet = await prisma.outlet.findUnique({
            where: { id: group.outletId },
            select: { name: true },
          });
          const outletName = outlet?.name || group.outletId;
          console.log(`      - ${outletName}: ${group._count}`);
        }
        console.log('');
      }
    }

    // Update failed requests to pending
    const updateData: any = {
      status: CrawlStatus.pending,
      errorMessage: null, // Clear error message
    };

    if (args.resetAttempts) {
      updateData.attempts = 0;
      console.log('⚠️  Resetting attempts counter to 0\n');
    }

    const result = await prisma.crawlRequest.updateMany({
      where: whereClause,
      data: updateData,
    });

    console.log(`✅ Successfully reset ${result.count} crawl request(s) to pending status`);
    if (!args.resetAttempts) {
      console.log(`   (Attempts counter preserved - they will be incremented on next retry)`);
    }
    console.log(`\n💡 These requests will be picked up by the crawler on the next run`);
    console.log(`   Run: npm run crawler:start`);

  } catch (error) {
    console.error('❌ Error retrying failed crawls:', error);
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

export { main as retryFailedCrawlsScript };

