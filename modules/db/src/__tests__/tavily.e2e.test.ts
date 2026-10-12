import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { createDefaultStageAdapters } from '../pipeline/sliceAdapters';
import { createTavilyTrendsAdapter } from '../pipeline/tavilyTrends';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_TAVILY_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('fixture daily trend stage E2E', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.trendSignal.deleteMany();
    await db.tavilySearchLog.deleteMany();
    await db.llmBudgetReservation.deleteMany();
    await db.llmUsage.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('keeps stored signals usable after later quota exhaustion and continues the pipeline', async () => {
    let calls = 0;
    const fetchImpl = jest.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [{ title: 'Trend', url: 'https://example.com/trend', score: 0.7 }],
          }),
        };
      }
      return { ok: false, status: 402, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const adapters = createDefaultStageAdapters();
    adapters.tavily_trends = createTavilyTrendsAdapter({
      db,
      client: { apiKey: 'tvly-test', fetchImpl },
    });

    const first = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=1',
        '--max-analysis-articles=1',
        '--trigger=manual',
      ],
      db,
      resource: 'p110-e2e-tavily',
      ownerToken: 'owner-tavily-1',
      adapters,
    });
    expect(first.exitCode).toBe(0);
    expect(first.summary.status).toBe('completed');
    expect(await db.trendSignal.count()).toBe(1);
    const rss = first.summary.stages.find((stage) => stage.stage === 'rss_refresh');
    expect(rss?.status).toBe('completed');

    const second = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=1',
        '--max-analysis-articles=1',
        '--trigger=manual',
      ],
      db,
      resource: 'p110-e2e-tavily-2',
      ownerToken: 'owner-tavily-2',
      adapters,
    });
    expect(second.exitCode).toBe(0);
    expect(second.summary.stages.find((stage) => stage.stage === 'tavily_trends')?.metrics)
      .toMatchObject({ rssUnblocked: true });
    expect(await db.trendSignal.count()).toBe(1);
  });
});
