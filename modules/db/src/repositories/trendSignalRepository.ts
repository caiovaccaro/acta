import type { Prisma, PrismaClient } from '@prisma/client';
import { searchLogDay, searchLogMonth, type TavilySearchResult } from '../../../core/src/tavily/client';
import type { NormalizedTrendSignal } from '../../../core/src/tavily/normalize';
import { remainingSearchBudget, TAVILY_QUERY_GROUPS } from '../../../core/src/tavily/queryGroups';
import { prisma } from '../index';

export async function countTavilySearches(
  now: Date,
  db: PrismaClient = prisma,
): Promise<{ usedToday: number; usedThisMonth: number }> {
  const day = searchLogDay(now);
  const month = searchLogMonth(now);
  const [usedToday, usedThisMonth] = await Promise.all([
    db.tavilySearchLog.count({ where: { day } }),
    db.tavilySearchLog.count({ where: { month } }),
  ]);
  return { usedToday, usedThisMonth };
}

export async function recordTavilySearchLog(
  input: {
    now: Date;
    queryGroup: string;
    query: string;
    status: string;
    resultCount: number;
    pipelineRunId?: string | null;
  },
  db: PrismaClient = prisma,
): Promise<void> {
  await db.tavilySearchLog.create({
    data: {
      day: searchLogDay(input.now),
      month: searchLogMonth(input.now),
      queryGroup: input.queryGroup,
      query: input.query,
      status: input.status,
      resultCount: input.resultCount,
      pipelineRunId: input.pipelineRunId ?? null,
    },
  });
}

export async function persistTrendSignals(
  input: {
    pipelineRunId?: string | null;
    signals: NormalizedTrendSignal[];
  },
  db: PrismaClient = prisma,
): Promise<number> {
  let stored = 0;
  for (const signal of input.signals) {
    try {
      await db.trendSignal.create({
        data: {
          query: signal.query,
          title: signal.title,
          url: signal.url,
          domain: signal.domain,
          publishedAt: signal.publishedAt,
          score: signal.score,
          pipelineRunId: input.pipelineRunId ?? null,
          rawResult: {
            title: signal.title,
            url: signal.url,
            domain: signal.domain,
            score: signal.score,
          } as Prisma.InputJsonValue,
        },
      });
      stored += 1;
    } catch {
      // Duplicate normalized URL is ignored so retries stay idempotent.
    }
  }
  return stored;
}

export async function tavilyBudgetRemaining(
  now: Date,
  db: PrismaClient = prisma,
) {
  const used = await countTavilySearches(now, db);
  return remainingSearchBudget(used);
}

export { TAVILY_QUERY_GROUPS };
export type { TavilySearchResult };
