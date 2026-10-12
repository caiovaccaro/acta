import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { loadOperationalHealth } from '../pipeline/operationalHealth';

const describeDatabase = process.env.RUN_OPERATIONAL_HEALTH_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('owner operational health against a stale fixture', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.question.deleteMany();
    await db.topic.deleteMany();
    await db.crawlRequest.deleteMany();
    await db.outlet.deleteMany();
    await db.llmBudgetReservation.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('reports stale, queues, moderation, and remaining budget for the owner view', async () => {
    const now = new Date('2026-10-12T12:00:00.000Z');
    await db.pipelineRun.create({
      data: {
        trigger: 'scheduled',
        status: 'completed',
        heartbeatAt: new Date('2026-10-10T00:00:00.000Z'),
        finishedAt: new Date('2026-10-09T00:00:00.000Z'),
      },
    });
    const outlet = await db.outlet.create({
      data: { name: 'E2E Health Outlet', ideology: 'Center', rssFeeds: [] },
    });
    await db.crawlRequest.create({
      data: { url: 'https://news.example.com/e2e-pending', outletId: outlet.id, status: 'pending' },
    });
    const topic = await db.topic.create({
      data: {
        name: 'Climate-health',
        description: 'Stale-fixture pending topic.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
      },
    });
    await db.question.create({
      data: {
        topicId: topic.id,
        questionText: 'Is the owner health view stale?',
        validationStatus: 'pending',
      },
    });

    const health = await loadOperationalHealth({ authorized: true, now, db });
    expect(health.overall).toBe('stale');
    expect(health.run.status).toBe('stale');
    expect(health.freshness.status).toBe('stale');
    expect(health.queues.pending).toBe(1);
    expect(health.moderation.topicsPending).toBe(1);
    expect(health.moderation.questionsPending).toBe(1);
    expect(health.budget.remainingUsd).toBe('30.000000');
  });
});
