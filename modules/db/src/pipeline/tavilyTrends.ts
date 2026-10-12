import type { PrismaClient } from '@prisma/client';
import {
  searchTavilyBasic,
  tavilyLogStatus,
  type TavilyClientConfig,
} from '../../../core/src/tavily/client';
import { TAVILY_QUERY_GROUPS } from '../../../core/src/tavily/queryGroups';
import {
  countTavilySearches,
  persistTrendSignals,
  recordTavilySearchLog,
} from '../repositories/trendSignalRepository';
import type { StageAdapter, StageOutcome } from './sliceAdapters';

export function createTavilyTrendsAdapter(options: {
  db: PrismaClient;
  client?: TavilyClientConfig;
  now?: () => Date;
}): StageAdapter {
  return {
    stage: 'tavily_trends',
    async run(context): Promise<StageOutcome> {
      const now = options.now?.() ?? new Date();
      const groups = [...TAVILY_QUERY_GROUPS];
      let stored = 0;
      let searches = 0;
      let degraded: string | null = null;
      for (let index = 0; index < groups.length; index += 1) {
        const group = groups[index];
        const used = await countTavilySearches(now, options.db);
        const result = await searchTavilyBasic({
          query: group.query,
          usedToday: used.usedToday,
          usedThisMonth: used.usedThisMonth,
        }, options.client ?? { apiKey: process.env.TAVILY_API_KEY });
        searches += 1;
        await recordTavilySearchLog({
          now,
          queryGroup: group.id,
          query: group.query,
          status: tavilyLogStatus(result),
          resultCount: result.signals.length,
          pipelineRunId: context.runId,
        }, options.db);
        if (result.ok) {
          stored += await persistTrendSignals({
            pipelineRunId: context.runId,
            signals: result.signals,
          }, options.db);
        } else {
          degraded = tavilyLogStatus(result);
          if (result.reason === 'quota') {
            break;
          }
        }
        await context.heartbeat();
      }
      await context.checkpoint({ day: now.toISOString().slice(0, 10) }, {
        searches,
        stored,
        degraded,
      });
      return {
        kind: 'completed',
        metrics: { searches, stored, degraded, rssUnblocked: true },
      };
    },
  };
}
