import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TEST_PIPELINE_EMAIL_FROM, TEST_PIPELINE_EMAIL_TO } from '../../../core/src/notifications/templates';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_AUTO_APPROVE_E2E_TESTS === '1'
  ? describe
  : describe.skip;

async function reset(db: PrismaClient) {
  await db.pipelineNotification.deleteMany();
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

describeDatabase('auto-approval publication E2E', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await reset(db);
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('publishes only the eligible topic and names it in the mutation email', async () => {
    const inbox: Array<{ subject: string; text: string }> = [];
    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { subject: string; text: string };
      inbox.push({ subject: body.subject, text: body.text });
      return { ok: true, json: async () => ({ id: `msg-${inbox.length}` }) };
    }) as unknown as typeof fetch;
    const outletA = await db.outlet.create({
      data: { name: 'E2E Auto A', ideology: 'Center', rssFeeds: [] },
    });
    const outletB = await db.outlet.create({
      data: { name: 'E2E Auto B', ideology: 'Right', rssFeeds: [] },
    });
    await db.topic.create({
      data: { name: 'Climate policy', moderationStatus: 'approved' },
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
    const incomplete = await db.topic.create({
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
          url: `https://news.example.com/e2e-auto-${index}`,
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
          url: `https://${domain}/e2e-auto-${index}`,
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
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
        ACTA_PUBLIC_URL: 'https://acta.example.invalid',
        ACTA_ADMIN_URL: 'https://acta.example.invalid/admin/topics',
      },
      db,
      resource: 'p117-e2e-auto',
      ownerToken: 'owner-auto',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl,
      },
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary.receipt.sent).toBe(true);
    expect(await db.topic.findUniqueOrThrow({ where: { id: eligible.id } }))
      .toMatchObject({ moderationStatus: 'approved' });
    expect(await db.topic.findUniqueOrThrow({ where: { id: incomplete.id } }))
      .toMatchObject({ moderationStatus: 'pending' });
    const publicTopics = await db.topic.findMany({ where: { moderationStatus: 'approved' } });
    expect(publicTopics.map((row) => row.name).sort()).toEqual(['AI regulation', 'Climate policy']);
    expect(publicTopics.some((row) => row.id === incomplete.id)).toBe(false);
    const autoEmail = inbox.find((row) => row.subject.includes('Auto-approved'));
    expect(autoEmail?.text).toContain('AI regulation');
    expect(autoEmail?.text).toContain(eligible.id);
  });
});
