import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_MODERATION_E2E_TESTS === '1'
  ? describe
  : describe.skip;

async function reset(db: PrismaClient) {
  await db.moderationPolicyDecision.deleteMany();
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

describeDatabase('shadow moderation slice E2E', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('proposes only the eligible approval and leaves every status unchanged', async () => {
    const outletA = await db.outlet.create({
      data: { name: 'E2E Moderation A', ideology: 'Center', rssFeeds: [] },
    });
    const outletB = await db.outlet.create({
      data: { name: 'E2E Moderation B', ideology: 'Right', rssFeeds: [] },
    });
    await db.topic.create({
      data: { name: 'Climate policy', moderationStatus: 'approved' },
    });
    const ready = await db.topic.create({
      data: {
        name: 'AI regulation',
        description: 'Oversight of frontier model deployment.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.9 },
      },
    });
    const incomplete = await db.topic.create({
      data: {
        name: 'Trade tariffs',
        description: 'Tariff policy in major economies.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.9 },
      },
    });
    const duplicate = await db.topic.create({
      data: {
        name: 'Climate-policy',
        description: 'Near duplicate of an approved topic name.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.9 },
      },
    });
    const sensitive = await db.topic.create({
      data: {
        name: 'suicide prevention debate',
        description: 'A safety-sensitive candidate that must stay pending.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.9 },
      },
    });

    for (const [index, outletId] of [outletA.id, outletB.id, outletA.id].entries()) {
      const article = await db.article.create({
        data: {
          url: `https://news.example.com/e2e-mod-${index}`,
          outletId,
          title: `AI regulation article ${index}`,
          textContent: 'body',
        },
      });
      await db.topicArticle.create({ data: { topicId: ready.id, articleId: article.id } });
    }
    for (const [index, domain] of ['news.example.com', 'policy.example.org', 'wire.example.net'].entries()) {
      await db.trendSignal.create({
        data: {
          query: 'technology and AI news last 24 hours',
          title: `AI regulation story ${index}`,
          url: `https://${domain}/e2e-mod-${index}`,
          domain,
          score: 0.8,
        },
      });
    }

    const result = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=1',
        '--max-analysis-articles=1',
        '--trigger=manual',
      ],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        AUTO_APPROVE_TOPICS: 'true',
        ACTA_LLM_MONTHLY_CEILING_USD: '30.000000',
      },
      db,
      resource: 'p112-e2e-moderation',
      ownerToken: 'owner-moderation',
    });

    expect(result.exitCode).toBe(0);
    const finalize = result.summary.stages.find((stage) => stage.stage === 'finalize');
    expect(finalize?.metrics).toMatchObject({
      receipt: { sent: false, reason: 'email_out_of_scope' },
      moderation: { mode: 'shadow', proposed: 1, pending: 3, mutated: false },
    });
    const stored = await db.moderationPolicyDecision.findMany();
    expect(stored).toHaveLength(4);
    expect(stored.filter((row) => row.decision === 'propose_approve').map((row) => row.subjectId))
      .toEqual([ready.id]);
    expect(await db.topic.findUniqueOrThrow({ where: { id: ready.id } }))
      .toMatchObject({ moderationStatus: 'pending' });
    expect(await db.topic.findUniqueOrThrow({ where: { id: incomplete.id } }))
      .toMatchObject({ moderationStatus: 'pending' });
    expect(await db.topic.findUniqueOrThrow({ where: { id: duplicate.id } }))
      .toMatchObject({ moderationStatus: 'pending' });
    expect(await db.topic.findUniqueOrThrow({ where: { id: sensitive.id } }))
      .toMatchObject({ moderationStatus: 'pending' });
  });
});
