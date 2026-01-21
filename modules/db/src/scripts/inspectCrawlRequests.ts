/**
 * Inspect Crawl Requests
 * 
 * Shows statistics and details about crawl requests by status.
 * Useful for debugging and understanding what's in the queue.
 * 
 * Usage:
 *   npm run db:inspect:crawl-requests
 *   npm run db:inspect:crawl-requests -- --outlet-id=<outlet-id>
 *   npm run db:inspect:crawl-requests -- --status=failed
 *   npm run db:inspect:crawl-requests -- --show-urls  # Show sample URLs
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  CrawlStatus,
  countCrawlRequestsByStatus,
  MAX_RETRY_ATTEMPTS,
} from '@acta/db';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

interface ScriptArgs {
  outletId?: string;
  status?: CrawlStatus;
  showUrls?: boolean;
  limit?: number;
}

function parseScriptArgs(): ScriptArgs {
  const { values } = parseArgs({
    options: {
      'outlet-id': { type: 'string' },
      'status': { type: 'string' },
      'show-urls': { type: 'boolean' },
      'limit': { type: 'string' },
    },
  });

  return {
    outletId: values['outlet-id'],
    status: values['status'] as CrawlStatus | undefined,
    showUrls: values['show-urls'] || false,
    limit: values['limit'] ? parseInt(values['limit'], 10) : 10,
  };
}

async function main() {
  const args = parseScriptArgs();

  console.log('📊 Inspecting Crawl Requests...\n');

  try {
    // Connect to database
    await connectDatabase();
    console.log('✅ Database connected\n');

    const whereClause: any = {};
    if (args.outletId) {
      whereClause.outletId = args.outletId;
      console.log(`📰 Filtering by outlet: ${args.outletId}\n`);
    }

    // Get overall statistics
    const stats = await countCrawlRequestsByStatus(
      args.outletId,
      MAX_RETRY_ATTEMPTS
    );

    const pendingTotal = await prisma.crawlRequest.count({
      where: {
        ...(args.outletId ? { outletId: args.outletId } : {}),
        status: CrawlStatus.pending,
      },
    });

    const pendingExceededRetries = await prisma.crawlRequest.count({
      where: {
        ...(args.outletId ? { outletId: args.outletId } : {}),
        status: CrawlStatus.pending,
        attempts: { gte: MAX_RETRY_ATTEMPTS },
      },
    });

    console.log('📈 Overall Statistics:');
    console.log(`   Pending (total): ${pendingTotal}`);
    console.log(`   Pending (eligible <${MAX_RETRY_ATTEMPTS}): ${stats[CrawlStatus.pending]}`);
    console.log(`   Pending (>=${MAX_RETRY_ATTEMPTS}): ${pendingExceededRetries}`);
    console.log(`   In Progress: ${stats[CrawlStatus.in_progress]}`);
    console.log(`   Done: ${stats[CrawlStatus.done]}`);
    console.log(`   Failed (all): ${stats[CrawlStatus.failed]}`);
    console.log(`   Failed (${MAX_RETRY_ATTEMPTS}+ attempts): ${stats.failedExceededRetries}`);
    console.log('');

    // If filtering by status, show details
    if (args.status) {
      const where: any = {
        ...whereClause,
        status: args.status,
      };

      const count = await prisma.crawlRequest.count({ where });
      console.log(`📋 ${args.status.toUpperCase()} Requests: ${count}\n`);

      if (count > 0) {
        const requests = await prisma.crawlRequest.findMany({
          where,
          include: {
            outlet: {
              select: { name: true },
            },
          },
          orderBy: {
            attempts: 'desc',
          },
          take: args.limit || 10,
        });

        // Group by attempts
        const byAttempts = new Map<number, number>();
        for (const req of requests) {
          const count = byAttempts.get(req.attempts) || 0;
          byAttempts.set(req.attempts, count + 1);
        }

        console.log('   Breakdown by attempts:');
        const sortedAttempts = Array.from(byAttempts.entries()).sort((a, b) => b[0] - a[0]);
        for (const [attempts, count] of sortedAttempts) {
          const marker = attempts >= MAX_RETRY_ATTEMPTS ? ' ⚠️' : '';
          console.log(`      ${attempts} attempts: ${count}${marker}`);
        }
        console.log('');

        if (args.showUrls && requests.length > 0) {
          console.log(`   Sample URLs (showing up to ${args.limit}):`);
          for (const req of requests.slice(0, args.limit || 10)) {
            const errorPreview = req.errorMessage
              ? ` - ${req.errorMessage.substring(0, 60)}${req.errorMessage.length > 60 ? '...' : ''}`
              : '';
            console.log(`      [${req.attempts} attempts] ${req.outlet.name}: ${req.url}${errorPreview}`);
          }
          console.log('');
        }
      }
    } else {
      // Show breakdown by outlet
      const breakdown = await prisma.crawlRequest.groupBy({
        by: ['outletId', 'status'],
        where: whereClause,
        _count: true,
      });

      if (breakdown.length > 0) {
        // Get outlet names
        const outletIds = [...new Set(breakdown.map(b => b.outletId))];
        const outlets = await prisma.outlet.findMany({
          where: { id: { in: outletIds } },
          select: { id: true, name: true },
        });
        const outletMap = new Map(outlets.map(o => [o.id, o.name]));

        console.log('📰 Breakdown by Outlet:');
        const outletGroups = new Map<string, Map<CrawlStatus, number>>();
        
        for (const group of breakdown) {
          const outletName = outletMap.get(group.outletId) || group.outletId;
          if (!outletGroups.has(outletName)) {
            outletGroups.set(outletName, new Map());
          }
          outletGroups.get(outletName)!.set(group.status, group._count);
        }

        for (const [outletName, statusCounts] of Array.from(outletGroups.entries()).sort()) {
          console.log(`   ${outletName}:`);
          for (const status of Object.values(CrawlStatus)) {
            const count = statusCounts.get(status) || 0;
            if (count > 0) {
              console.log(`      ${status}: ${count}`);
            }
          }
        }
        console.log('');
      }
    }

    // Show failed requests with different attempt counts
    if (!args.status || args.status === CrawlStatus.failed) {
      const failedByAttempts = await prisma.crawlRequest.groupBy({
        by: ['attempts'],
        where: {
          ...whereClause,
          status: CrawlStatus.failed,
        },
        _count: true,
        orderBy: {
          attempts: 'desc',
        },
      });

      if (failedByAttempts.length > 0) {
        console.log('❌ Failed Requests by Attempt Count:');
        for (const group of failedByAttempts) {
          const marker = group.attempts >= MAX_RETRY_ATTEMPTS ? ' ⚠️  (exceeded retry limit)' : '';
          console.log(`   ${group.attempts} attempts: ${group._count}${marker}`);
        }
        console.log('');
        console.log(`💡 To retry failed requests with ${MAX_RETRY_ATTEMPTS}+ attempts:`);
        console.log(`   npm run db:retry:failed-crawls${args.outletId ? ` -- --outlet-id=${args.outletId}` : ''}`);
      }
    }

  } catch (error) {
    console.error('❌ Error inspecting crawl requests:', error);
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

export { main as inspectCrawlRequestsScript };

