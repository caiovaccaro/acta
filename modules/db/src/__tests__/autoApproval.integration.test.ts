import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { evaluatePendingTopicsShadow } from '../repositories/moderationPolicyRepository';

const describeDatabase = process.env.RUN_AUTO_APPROVE_DB_TESTS === '1'
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
  await db.pipelineLeaseEvent.deleteMany();
  await db.pipelineLease.deleteMany();
  await db.pipelineStageRun.deleteMany();
  await db.pipelineRun.deleteMany();
}

describeDatabase('Level 1 auto-approval transactions', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('approves only the eligible topic atomically and leaves ineligible pending', async () => {
    const outletA = await db.outlet.create({
      data: { name: 'Auto Outlet A', ideology: 'Center', rssFeeds: [] },
    });
    const outletB = await db.outlet.create({
      data: { name: 'Auto Outlet B', ideology: 'Left', rssFeeds: [] },
    });
    const eligible = await db.topic.create({
      data: {
        name: 'AI regulation',
        description: 'Oversight of frontier model deployment.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.9 },
      },
    });
    const ineligible = await db.topic.create({
      data: {
        name: 'Trade tariffs',
        description: 'Tariff policy in major economies.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
        discoveredFromArticles: { confidence: 0.9 },
      },
    });
    for (const [index, outletId] of [outletA.id, outletB.id, outletA.id].entries()) {
      const article = await db.article.create({
        data: {
          url: `https://news.example.com/auto-${index}`,
          outletId,
          title: `AI regulation article ${index}`,
          textContent: 'body',
        },
      });
      await db.topicArticle.create({ data: { topicId: eligible.id, articleId: article.id } });
    }
    for (const [index, domain] of ['news.example.com', 'policy.example.org', 'wire.example.net'].entries()) {
      await db.trendSignal.create({
        data: {
          query: 'technology and AI news last 24 hours',
          title: `AI regulation story ${index}`,
          url: `https://${domain}/auto-${index}`,
          domain,
          score: 0.8,
        },
      });
    }

    const result = await evaluatePendingTopicsShadow({
      db,
      remainingUsd: '5.000000',
      env: { AUTO_APPROVE_TOPICS: 'true' },
    });

    expect(result.mutated).toBe(true);
    expect(result.mutatedTopics.map((row) => row.id)).toEqual([eligible.id]);
    expect(await db.topic.findUniqueOrThrow({ where: { id: eligible.id } }))
      .toMatchObject({ moderationStatus: 'approved' });
    expect(await db.topic.findUniqueOrThrow({ where: { id: ineligible.id } }))
      .toMatchObject({ moderationStatus: 'pending' });
    const stored = await db.moderationPolicyDecision.findMany();
    expect(stored.find((row) => row.subjectId === eligible.id)).toMatchObject({
      decision: 'approved',
      mode: 'live',
    });
    expect(stored.find((row) => row.subjectId === ineligible.id)).toMatchObject({
      decision: 'pending',
      mode: 'shadow',
    });
  });
});
