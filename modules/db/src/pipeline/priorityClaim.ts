import type { PrismaClient } from '@prisma/client';
import {
  allocateWork,
  matchSignals,
  type AllocatedItem,
  type SignalMatch,
  type WorkItem,
} from '../../../core/src/tavily/priority';
import { domainFromUrl } from '../../../core/src/tavily/normalize';
import { claimCrawlRequestsByIds } from '../repositories/crawlRequestRepository';

export async function loadPriorityCatalog(db: PrismaClient) {
  const [signals, topics, articles, crawls] = await Promise.all([
    db.trendSignal.findMany(),
    db.topic.findMany({ select: { id: true, name: true, moderationStatus: true } }),
    db.article.findMany({
      include: {
        topicArticles: { select: { topicId: true } },
        articleAnalysisAttempts: { select: { id: true }, take: 1 },
      },
    }),
    db.crawlRequest.findMany({
      where: { status: 'pending' },
    }),
  ]);
  return { signals, topics, articles, crawls };
}

export function matchCatalog(
  catalog: Awaited<ReturnType<typeof loadPriorityCatalog>>,
): SignalMatch[] {
  return matchSignals(
    catalog.signals.map((signal) => ({
      id: signal.id,
      url: signal.url,
      title: signal.title,
      domain: signal.domain,
    })),
    catalog.articles.map((article) => ({
      id: article.id,
      url: article.url,
      title: article.title,
      domain: domainFromUrl(article.url),
    })),
    catalog.crawls.map((crawl) => ({
      id: crawl.id,
      url: crawl.url,
    })),
    catalog.topics.map((topic) => ({
      id: topic.id,
      name: topic.name,
      approved: topic.moderationStatus === 'approved',
    })),
  );
}

export async function persistSignalMatches(
  matches: SignalMatch[],
  db: PrismaClient,
): Promise<number> {
  let updated = 0;
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (match.reason === 'ambiguous' || match.reason === 'unmatched') {
      continue;
    }
    await db.trendSignal.update({
      where: { id: match.signalId },
      data: {
        matchedTopicId: match.matchedTopicId,
        matchedArticleId: match.matchedArticleId,
        matchedCrawlRequestId: match.matchedCrawlRequestId,
      },
    });
    updated += 1;
  }
  return updated;
}

export function crawlWorkItems(
  catalog: Awaited<ReturnType<typeof loadPriorityCatalog>>,
  matches: SignalMatch[],
): WorkItem[] {
  return catalog.crawls.map((crawl) => ({
    id: crawl.id,
    kind: 'crawl',
    createdAt: crawl.createdAt,
    publishedAt: null,
    exactMatch: matches.some((match) => match.matchedCrawlRequestId === crawl.id),
    topicTrend: matches.some(
      (match) => match.matchedCrawlRequestId === crawl.id && match.matchedTopicId != null,
    ),
  }));
}

export function articleWorkItems(
  catalog: Awaited<ReturnType<typeof loadPriorityCatalog>>,
  matches: SignalMatch[],
): WorkItem[] {
  const trendingTopics = new Set(
    matches.filter((match) => match.matchedTopicId).map((match) => match.matchedTopicId as string),
  );
  return catalog.articles
    .filter((article) => article.articleAnalysisAttempts.length === 0)
    .map((article) => ({
      id: article.id,
      kind: 'article' as const,
      createdAt: article.createdAt,
      publishedAt: article.publishedDate,
      exactMatch: matches.some((match) => match.matchedArticleId === article.id),
      topicTrend: article.topicArticles.some((link) => trendingTopics.has(link.topicId)),
    }));
}

export function allocateKind(
  items: WorkItem[],
  cap: number,
  now: Date,
): AllocatedItem[] {
  return allocateWork(items, cap, now);
}

export async function claimAllocatedCrawls(
  allocated: AllocatedItem[],
  db: PrismaClient,
): Promise<string[]> {
  return claimCrawlRequestsByIds(
    allocated.filter((item) => item.kind === 'crawl').map((item) => item.id),
    db,
  );
}

export function poolMetrics(allocated: AllocatedItem[], claimedIds: string[]) {
  const claimed = new Set(claimedIds);
  return {
    processed: claimedIds.length,
    priority: allocated.filter((item) => item.pool === 'priority' && claimed.has(item.id)).length,
    age: allocated.filter((item) => item.pool === 'age' && claimed.has(item.id)).length,
    claimedIds,
  };
}
