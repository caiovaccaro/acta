import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { loadOperationalHealth } from '../pipeline/operationalHealth';

const describeDatabase = process.env.RUN_OPERATIONAL_HEALTH_DB_TESTS === '1'
  ? describe
  : describe.skip;

async function reset(db: PrismaClient) {
  await db.question.deleteMany();
  await db.topic.deleteMany();
  await db.crawlRequest.deleteMany();
  await db.outlet.deleteMany();
  await db.llmBudgetReservation.deleteMany();
  await db.llmUsage.deleteMany();
  await db.pipelineLeaseEvent.deleteMany();
  await db.pipelineLease.deleteMany();
  await db.pipelineStageRun.deleteMany();
  await db.pipelineRun.deleteMany();
}

describeDatabase('authenticated operational health snapshot', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('maps real pipeline, queue, moderation, and budget records', async () => {
    const now = new Date('2026-10-12T12:00:00.000Z');
    await db.pipelineRun.create({
      data: {
        trigger: 'manual',
        status: 'running',
        heartbeatAt: new Date('2026-10-12T11:00:00.000Z'),
        finishedAt: new Date('2026-10-09T12:00:00.000Z'),
      },
    });
    const outlet = await db.outlet.create({
      data: { name: 'Health Outlet', ideology: 'Center', rssFeeds: [] },
    });
    await db.crawlRequest.create({
      data: { url: 'https://news.example.com/pending', outletId: outlet.id, status: 'pending' },
    });
    await db.crawlRequest.create({
      data: { url: 'https://news.example.com/progress', outletId: outlet.id, status: 'in_progress' },
    });
    await db.crawlRequest.create({
      data: { url: 'https://news.example.com/failed', outletId: outlet.id, status: 'failed' },
    });
    const pendingTopic = await db.topic.create({
      data: {
        name: 'Health-policy',
        description: 'Pending topic for operational health.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
      },
    });
    await db.question.create({
      data: {
        topicId: pendingTopic.id,
        questionText: 'Does the pipeline report pending questions?',
        validationStatus: 'pending',
      },
    });

    const unauthorized = await loadOperationalHealth({ authorized: false, now, db });
    expect(unauthorized.overall).toBe('unauthorized');
    expect(unauthorized.queues.pending).toBeUndefined();

    const health = await loadOperationalHealth({ authorized: true, now, db });
    expect(health.authorized).toBe(true);
    expect(health.run.status).toBe('stale');
    expect(health.freshness.status).toBe('stale');
    expect(health.queues).toMatchObject({ pending: 1, inProgress: 1, failed: 1 });
    expect(health.moderation).toMatchObject({ topicsPending: 1, questionsPending: 1 });
    expect(health.budget.ceilingUsd).toBe('30.000000');
    expect(health.budget.remainingUsd).toBeDefined();
  });
});
