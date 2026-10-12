import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { searchTavilyBasic } from '../../../core/src/tavily/client';
import { persistTrendSignals, recordTavilySearchLog } from '../repositories/trendSignalRepository';

const describeDatabase = process.env.RUN_TAVILY_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('Tavily HTTP and persistence integration', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.trendSignal.deleteMany();
    await db.tavilySearchLog.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('persists signals only when valid and degrades specified failures', async () => {
    const run = await db.pipelineRun.create({ data: { trigger: 'manual' } });
    const successFetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        results: [
          { title: 'Valid', url: 'https://example.com/story', score: 0.8 },
          { title: 'Bad', url: 'ftp://example.com/x', score: 0.9 },
        ],
      }),
    })) as unknown as typeof fetch;

    const success = await searchTavilyBasic({
      query: 'technology and AI news last 24 hours',
      usedToday: 0,
      usedThisMonth: 0,
    }, { apiKey: 'tvly-test', fetchImpl: successFetch });
    expect(success.ok).toBe(true);
    const stored = await persistTrendSignals({
      pipelineRunId: run.id,
      signals: success.ok ? success.signals : [],
    }, db);
    await recordTavilySearchLog({
      now: new Date(),
      queryGroup: 'technology_ai',
      query: 'technology and AI news last 24 hours',
      status: 'success',
      resultCount: stored,
      pipelineRunId: run.id,
    }, db);
    expect(stored).toBe(1);
    expect(await db.trendSignal.count()).toBe(1);

    const quotaFetch = jest.fn(async () => ({
      ok: false,
      status: 402,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const quota = await searchTavilyBasic({
      query: 'q',
      usedToday: 0,
      usedThisMonth: 0,
    }, { apiKey: 'tvly-test', fetchImpl: quotaFetch });
    expect(quota).toMatchObject({ ok: false, reason: 'quota', signals: [] });
    expect(await db.trendSignal.count()).toBe(1);
  });
});
