import { CheerioCrawler } from 'crawlee';
import {
    connectDatabase,
    CrawlStatus,
    disconnectDatabase,
    findOrCreateOutlet,
    Ideology,
    prisma,
    resetStuckInProgressRequests,
} from '@acta/db';
import { cheerioRouter } from '../crawlers/articleCrawler.js';
import { loadOutlets } from '../config/crawlerConfig.js';
import {
    parseCrawlerArgs,
    resolveSelectedOutlets,
} from '../config/crawlerOptions.js';
import { claimPendingArticles } from '../utils/postgresQueue.js';

const ideologyMap = {
    Left: Ideology.Left,
    Center: Ideology.Center,
    Right: Ideology.Right,
};

function rssFeedsForOutlet(outlet) {
    if (Array.isArray(outlet.rssFeeds)) {
        return outlet.rssFeeds
            .map((feed) => typeof feed === 'string'
                ? { name: null, url: feed }
                : { name: feed?.name ?? null, url: feed?.url ?? feed?.link })
            .filter(({ url }) => Boolean(url));
    }
    return outlet.rssUrl ? [{ name: null, url: outlet.rssUrl }] : [];
}

function emptyResult(selectedOutlets, maxArticles) {
    return {
        selectedOutlets: selectedOutlets.map(({ name }) => name),
        maxArticles,
        discovered: 0,
        claimed: 0,
        completed: 0,
        failed: 0,
        remaining: 0,
    };
}

async function ensureSelectedOutlets(selectedOutlets) {
    const records = [];
    for (const outlet of selectedOutlets) {
        const record = await findOrCreateOutlet(
            outlet.name,
            ideologyMap[outlet.ideology] ?? Ideology.Center,
            0.5,
            rssFeedsForOutlet(outlet).map(({ url }) => url),
        );
        records.push(record);
    }
    return records;
}

async function countRequests(outletIds, statuses = undefined) {
    return prisma.crawlRequest.count({
        where: {
            outletId: { in: outletIds },
            ...(statuses ? { status: { in: statuses } } : {}),
        },
    });
}

/**
 * Runs one validated, finite crawler slice and returns persisted counts.
 */
export async function runCrawlerSlice({
    selectedOutlets,
    maxArticles,
    staleRequestThresholdMinutes = 60,
}) {
    const result = emptyResult(selectedOutlets, maxArticles);
    if (maxArticles === 0) {
        return result;
    }

    await connectDatabase();
    try {
        await resetStuckInProgressRequests(staleRequestThresholdMinutes);
        const outletRecords = await ensureSelectedOutlets(selectedOutlets);
        const outletIds = outletRecords.map(({ id }) => id);
        const requestsBeforeFeeds = await countRequests(outletIds);

        const rssRequests = selectedOutlets.flatMap((outlet) =>
            rssFeedsForOutlet(outlet).map((feed) => ({
                url: feed.url,
                label: 'rss',
                userData: {
                    source: outlet.name,
                    feedUrl: feed.url,
                    feedName: feed.name,
                    outletConfig: outlet,
                },
            })),
        );

        if (rssRequests.length > 0) {
            const rssCrawler = new CheerioCrawler({
                requestHandler: cheerioRouter,
                maxRequestsPerCrawl: rssRequests.length,
                additionalMimeTypes: [
                    'application/rss+xml',
                    'application/atom+xml',
                ],
                maxConcurrency: 5,
                requestHandlerTimeoutSecs: 60,
            });
            await rssCrawler.run(rssRequests);
        }

        const requestsAfterFeeds = await countRequests(outletIds);
        result.discovered = Math.max(0, requestsAfterFeeds - requestsBeforeFeeds);

        const articleRequests = await claimPendingArticles(
            outletIds,
            maxArticles,
            selectedOutlets,
        );
        result.claimed = articleRequests.length;

        if (articleRequests.length > 0) {
            const articleCrawler = new CheerioCrawler({
                requestHandler: cheerioRouter,
                maxRequestsPerCrawl: maxArticles,
                maxConcurrency: Math.min(maxArticles, 5),
                requestHandlerTimeoutSecs: 60,
            });
            try {
                await articleCrawler.run(articleRequests);
            } catch (error) {
                const claimedIds = articleRequests.map(
                    ({ userData }) => userData.crawlRequestId,
                );
                await prisma.crawlRequest.updateMany({
                    where: {
                        id: { in: claimedIds },
                        status: CrawlStatus.in_progress,
                    },
                    data: { status: CrawlStatus.pending },
                });
                console.error('Crawler slice completed partially:', error.message);
            }
        }

        const claimedIds = articleRequests.map(
            ({ userData }) => userData.crawlRequestId,
        );
        if (claimedIds.length > 0) {
            const grouped = await prisma.crawlRequest.groupBy({
                by: ['status'],
                where: { id: { in: claimedIds } },
                _count: true,
            });
            const countByStatus = Object.fromEntries(
                grouped.map(({ status, _count }) => [status, _count]),
            );
            result.completed = countByStatus[CrawlStatus.done] ?? 0;
            result.failed = countByStatus[CrawlStatus.failed] ?? 0;
        }

        result.remaining = await countRequests(outletIds, [
            CrawlStatus.pending,
            CrawlStatus.in_progress,
            CrawlStatus.failed,
        ]);
        return result;
    } finally {
        await disconnectDatabase();
    }
}

export async function executeCrawler(
    argv = process.argv.slice(2),
    env = process.env,
    catalog = loadOutlets(),
) {
    const options = parseCrawlerArgs(argv, env);
    const selectedOutlets = resolveSelectedOutlets(
        options.outletNames,
        catalog,
    );
    return runCrawlerSlice({ selectedOutlets, maxArticles: options.maxArticles });
}
