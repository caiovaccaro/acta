import type { PrismaClient } from '@prisma/client';
import type { StageAdapter, StageOutcome } from './sliceAdapters';
import {
  allocateKind,
  articleWorkItems,
  claimAllocatedCrawls,
  crawlWorkItems,
  loadPriorityCatalog,
  matchCatalog,
  persistSignalMatches,
  poolMetrics,
} from './priorityClaim';

export function createTavilyPriorityAdapter(options: {
  db: PrismaClient;
  now?: () => Date;
}): StageAdapter {
  return {
    stage: 'tavily_priority',
    async run(context): Promise<StageOutcome> {
      const catalog = await loadPriorityCatalog(options.db);
      const matches = matchCatalog(catalog);
      const linked = await persistSignalMatches(matches, options.db);
      await context.checkpoint({ matched: linked }, {
        linked,
        unmatched: matches.filter((match) => match.reason === 'unmatched').length,
        ambiguous: matches.filter((match) => match.reason === 'ambiguous').length,
        publishedFromSignals: 0,
      });
      return {
        kind: 'completed',
        metrics: {
          linked,
          unmatched: matches.filter((match) => match.reason === 'unmatched').length,
          ambiguous: matches.filter((match) => match.reason === 'ambiguous').length,
          publishedFromSignals: 0,
        },
      };
    },
  };
}

export function createPriorityExtractionAdapter(options: {
  db: PrismaClient;
  now?: () => Date;
}): StageAdapter {
  return {
    stage: 'article_extraction',
    async run(context): Promise<StageOutcome> {
      const now = options.now?.() ?? new Date();
      const catalog = await loadPriorityCatalog(options.db);
      const matches = matchCatalog(catalog);
      const allocated = allocateKind(
        crawlWorkItems(catalog, matches),
        context.limits.maxNewArticles,
        now,
      );
      const claimedIds = await claimAllocatedCrawls(allocated, options.db);
      const metrics = poolMetrics(allocated, claimedIds);
      await context.heartbeat();
      return {
        kind: 'completed',
        metrics: {
          ...metrics,
          backlogRemaining: catalog.crawls.length > claimedIds.length,
        },
        backlogRemaining: catalog.crawls.length > claimedIds.length,
      };
    },
  };
}

export function createPriorityAnalysisAdapter(options: {
  db: PrismaClient;
  now?: () => Date;
}): StageAdapter {
  return {
    stage: 'stance_classification',
    async run(context): Promise<StageOutcome> {
      const now = options.now?.() ?? new Date();
      const catalog = await loadPriorityCatalog(options.db);
      const matches = matchCatalog(catalog);
      const items = articleWorkItems(catalog, matches);
      const allocated = allocateKind(items, context.limits.maxAnalysisArticles, now);
      const selectedIds = allocated.map((item) => item.id);
      const metrics = poolMetrics(allocated, selectedIds);
      await context.heartbeat();
      return {
        kind: 'completed',
        metrics: {
          ...metrics,
          mutated: false,
          backlogRemaining: items.length > selectedIds.length,
        },
        backlogRemaining: items.length > selectedIds.length,
      };
    },
  };
}
