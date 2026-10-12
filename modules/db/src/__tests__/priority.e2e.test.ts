import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_PRIORITY_E2E_TESTS === '1'
  ? describe
  : describe.skip;

async function reset(db: PrismaClient) {
  await db.articleAnalysisAttempt.deleteMany();
  await db.topicArticle.deleteMany();
  await db.article.deleteMany();
  await db.crawlRequest.deleteMany();
  await db.topic.deleteMany();
  await db.outlet.deleteMany();
  await db.trendSignal.deleteMany();
  await db.tavilySearchLog.deleteMany();
  await db.llmBudgetReservation.deleteMany();
  await db.llmUsage.deleteMany();
  await db.pipelineLeaseEvent.deleteMany();
  await db.pipelineLease.deleteMany();
  await db.pipelineStageRun.deleteMany();
  await db.pipelineRun.deleteMany();
}

describeDatabase('priority slice E2E', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('runs trending work first and does not starve older work under a low budget cap', async () => {
    const outlet = await db.outlet.create({
      data: { name: 'E2E Priority Outlet', ideology: 'Center', rssFeeds: [] },
    });
    const trendingIds: string[] = [];
    for (let index = 0; index < 7; index += 1) {
      const crawl = await db.crawlRequest.create({
        data: {
          url: `https://news.example.com/e2e-trend-${index}`,
          outletId: outlet.id,
          createdAt: new Date(`2026-10-11T0${index}:00:00.000Z`),
        },
      });
      trendingIds.push(crawl.id);
      await db.trendSignal.create({
        data: {
          query: 'technology and AI news last 24 hours',
          title: 'AI regulation talks',
          url: crawl.url,
          domain: 'news.example.com',
          score: 0.9,
        },
      });
    }
    const oldestIds: string[] = [];
    for (let index = 0; index < 3; index += 1) {
      const crawl = await db.crawlRequest.create({
        data: {
          url: `https://news.example.com/e2e-old-${index}`,
          outletId: outlet.id,
          createdAt: new Date(`2026-08-0${index + 1}T00:00:00.000Z`),
        },
      });
      oldestIds.push(crawl.id);
    }

    const argv = [
      '--max-runtime-minutes=285',
      '--max-new-articles=10',
      '--max-analysis-articles=10',
      '--trigger=manual',
    ];
    const env = {
      DATABASE_URL: process.env.DATABASE_URL,
      ACTA_LLM_MONTHLY_CEILING_USD: '0.100000',
    };

    const claimed: string[] = [];
    for (let slice = 0; slice < 3; slice += 1) {
      const result = await runPipelineSlice({
        argv,
        env,
        db,
        resource: `p111-e2e-priority-${slice}`,
        ownerToken: `owner-priority-${slice}`,
      });
      expect(result.exitCode).toBe(0);
      expect(result.summary.caps.newArticles).toMatchObject({
        configured: 10,
        budgetDerived: 2,
        effective: 2,
        skippedDueToBudget: 8,
      });
      const extraction = result.summary.stages.find((stage) => stage.stage === 'article_extraction');
      const metrics = extraction?.metrics as { claimedIds: string[]; priority: number; age: number };
      expect(metrics.claimedIds).toHaveLength(2);
      expect(metrics.priority).toBe(1);
      expect(metrics.age).toBe(1);
      claimed.push(...metrics.claimedIds);
    }

    expect(trendingIds).toContain(claimed[0]);
    expect(claimed.filter((id) => oldestIds.includes(id))).toEqual(oldestIds);
    expect(claimed.filter((id) => trendingIds.includes(id))).toHaveLength(3);
    expect(new Set(claimed).size).toBe(6);
  });
});
