import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { evaluatePendingTopicsShadow } from '../repositories/moderationPolicyRepository';

const describeDatabase = process.env.RUN_MODERATION_DB_TESTS === '1'
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

describeDatabase('shadow moderation policy integration', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('stores an auditable proposal without mutating moderation status', async () => {
    const outletA = await db.outlet.create({
      data: { name: 'Moderation Outlet A', ideology: 'Center', rssFeeds: [] },
    });
    const outletB = await db.outlet.create({
      data: { name: 'Moderation Outlet B', ideology: 'Left', rssFeeds: [] },
    });
    const topic = await db.topic.create({
      data: {
        name: 'AI regulation',
        description: 'Oversight of frontier model deployment.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.85 },
      },
    });
    for (const [index, outletId] of [outletA.id, outletB.id, outletA.id].entries()) {
      const article = await db.article.create({
        data: {
          url: `https://news.example.com/mod-${index}`,
          outletId,
          title: `AI regulation article ${index}`,
          textContent: 'body',
        },
      });
      await db.topicArticle.create({ data: { topicId: topic.id, articleId: article.id } });
    }
    for (const [index, domain] of ['news.example.com', 'policy.example.org', 'wire.example.net'].entries()) {
      await db.trendSignal.create({
        data: {
          query: 'technology and AI news last 24 hours',
          title: `AI regulation story ${index}`,
          url: `https://${domain}/mod-${index}`,
          domain,
          score: 0.7,
        },
      });
    }

    const before = await db.topic.findUniqueOrThrow({ where: { id: topic.id } });
    const result = await evaluatePendingTopicsShadow({
      db,
      remainingUsd: '5.000000',
    });

    expect(result.mutated).toBe(false);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0]).toMatchObject({
      decision: 'propose_approve',
      mode: 'shadow',
      mutateStatus: false,
    });
    expect(result.decisions[0].conditions).toHaveLength(8);
    expect(await db.topic.findUniqueOrThrow({ where: { id: topic.id } })).toMatchObject({
      moderationStatus: before.moderationStatus,
    });
    const stored = await db.moderationPolicyDecision.findMany({ where: { subjectId: topic.id } });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      decision: 'propose_approve',
      mode: 'shadow',
      policyVersion: result.decisions[0].policyVersion,
    });
  });
});
