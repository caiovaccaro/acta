import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_PRIORITY_DB_TESTS === '1'
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

describeDatabase('priority stage selection integration', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('claims 70/30 priority and age pools without duplicate ids', async () => {
    const outlet = await db.outlet.create({
      data: { name: 'Priority Outlet', ideology: 'Center', rssFeeds: [] },
    });
    const topic = await db.topic.create({
      data: { name: 'AI regulation', moderationStatus: 'approved' },
    });
    const trending = [];
    for (let index = 0; index < 7; index += 1) {
      const crawl = await db.crawlRequest.create({
        data: {
          url: `https://news.example.com/trend-${index}`,
          outletId: outlet.id,
          createdAt: new Date(`2026-10-11T0${index}:00:00.000Z`),
        },
      });
      trending.push(crawl);
      await db.trendSignal.create({
        data: {
          query: 'technology and AI news last 24 hours',
          title: 'AI regulation talks',
          url: crawl.url,
          domain: 'news.example.com',
          score: 0.8,
        },
      });
    }
    const oldest = [];
    for (let index = 0; index < 3; index += 1) {
      oldest.push(await db.crawlRequest.create({
        data: {
          url: `https://news.example.com/old-${index}`,
          outletId: outlet.id,
          createdAt: new Date(`2026-08-0${index + 1}T00:00:00.000Z`),
        },
      }));
    }
    for (let index = 0; index < 7; index += 1) {
      const article = await db.article.create({
        data: {
          url: `https://news.example.com/article-trend-${index}`,
          outletId: outlet.id,
          title: `AI regulation article ${index}`,
          textContent: 'body',
          createdAt: new Date(`2026-10-11T0${index}:00:00.000Z`),
          publishedDate: new Date(`2026-10-11T0${index}:00:00.000Z`),
        },
      });
      await db.topicArticle.create({
        data: { topicId: topic.id, articleId: article.id },
      });
    }
    for (let index = 0; index < 3; index += 1) {
      await db.article.create({
        data: {
          url: `https://news.example.com/article-old-${index}`,
          outletId: outlet.id,
          title: `Old article ${index}`,
          textContent: 'body',
          createdAt: new Date(`2026-08-0${index + 1}T00:00:00.000Z`),
        },
      });
    }

    const result = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=10',
        '--max-analysis-articles=10',
        '--trigger=manual',
      ],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        ACTA_LLM_MONTHLY_CEILING_USD: '30.000000',
      },
      db,
      resource: 'p111-integration-priority',
      ownerToken: 'owner-priority',
    });

    expect(result.exitCode).toBe(0);
    const extraction = result.summary.stages.find((stage) => stage.stage === 'article_extraction');
    const analysis = result.summary.stages.find((stage) => stage.stage === 'stance_classification');
    const extractionMetrics = extraction?.metrics as {
      processed: number;
      priority: number;
      age: number;
      claimedIds: string[];
    };
    const analysisMetrics = analysis?.metrics as {
      processed: number;
      priority: number;
      age: number;
      claimedIds: string[];
      mutated: boolean;
    };
    expect(extractionMetrics.processed).toBe(10);
    expect(extractionMetrics.priority).toBe(7);
    expect(extractionMetrics.age).toBe(3);
    expect(new Set(extractionMetrics.claimedIds).size).toBe(10);
    expect(extractionMetrics.claimedIds.slice(7)).toEqual(oldest.map((row) => row.id));
    expect(analysisMetrics.processed).toBe(10);
    expect(analysisMetrics.priority).toBe(7);
    expect(analysisMetrics.age).toBe(3);
    expect(analysisMetrics.mutated).toBe(false);
    expect(new Set(analysisMetrics.claimedIds).size).toBe(10);
    expect(result.summary.caps.newArticles.effective).toBe(10);
    expect(await db.crawlRequest.count({ where: { status: 'in_progress' } })).toBe(10);
    expect(await db.article.count()).toBe(10);
  });
});
