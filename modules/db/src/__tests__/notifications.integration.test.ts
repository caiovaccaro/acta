import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TEST_PIPELINE_EMAIL_FROM, TEST_PIPELINE_EMAIL_TO } from '../../../core/src/notifications/templates';
import { createDefaultStageAdapters } from '../pipeline/sliceAdapters';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_NOTIFICATION_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('Resend notification persistence', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.pipelineNotification.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
    await db.topic.deleteMany({ where: { name: 'P113-digest-topic' } });
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('records Resend acceptance, rejection, and timeout without corrupting pipeline state', async () => {
    const acceptedFetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'msg-ok' }),
    })) as unknown as typeof fetch;
    const accepted = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
        ACTA_PUBLIC_URL: 'https://acta.example.invalid',
        ACTA_ADMIN_URL: 'https://acta.example.invalid/admin/topics',
      },
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-int-accept',
      ownerToken: 'owner-accept',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl: acceptedFetch,
      },
    });
    expect(accepted.exitCode).toBe(0);
    expect(accepted.summary.status).toBe('completed');
    expect(accepted.summary.receipt).toMatchObject({ sent: true, kind: 'success' });
    expect(await db.pipelineRun.count({ where: { status: 'completed' } })).toBe(1);

    const rejectedFetch = jest.fn(async () => ({
      ok: false,
      status: 422,
      json: async () => ({}),
    })) as unknown as typeof fetch;
    const rejected = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
      },
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-int-reject',
      ownerToken: 'owner-reject',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl: rejectedFetch,
      },
    });
    expect(rejected.exitCode).toBe(0);
    expect(rejected.summary.status).toBe('completed');
    expect(rejected.summary.receipt).toMatchObject({ sent: false, reason: 'rejected' });

    const timeoutFetch = jest.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;
    const timeout = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
      },
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-int-timeout',
      ownerToken: 'owner-timeout',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl: timeoutFetch,
      },
    });
    expect(timeout.exitCode).toBe(0);
    expect(timeout.summary.status).toBe('completed');
    expect(timeout.summary.receipt).toMatchObject({ sent: false, reason: 'timeout' });

    const networkFetch = jest.fn(async () => {
      throw new Error('fetch failed');
    }) as unknown as typeof fetch;
    const network = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
      },
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-int-network',
      ownerToken: 'owner-network',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl: networkFetch,
      },
    });
    expect(network.exitCode).toBe(0);
    expect(network.summary.status).toBe('completed');
    expect(network.summary.receipt).toMatchObject({ sent: false, reason: 'network' });

    const rows = await db.pipelineNotification.findMany({ orderBy: { createdAt: 'asc' } });
    expect(rows.filter((row) => row.kind !== 'moderation_digest').map((row) => row.status))
      .toEqual(['accepted', 'rejected', 'timeout', 'network']);
    expect(JSON.stringify(rows)).not.toContain(TEST_PIPELINE_EMAIL_TO);
    expect(JSON.stringify(rows)).not.toContain('re_test');
  });

  it('sends a moderation digest when topics are pending and keeps the run completed if digest fails', async () => {
    await db.topic.create({
      data: {
        name: 'P113-digest-topic',
        description: 'Pending topic used only for digest coverage.',
        source: 'auto_discovered',
        moderationStatus: 'pending',
      },
    });
    const okFetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'msg-digest' }),
    })) as unknown as typeof fetch;
    const digestOk = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
        ACTA_PUBLIC_URL: 'https://acta.example.invalid',
        ACTA_ADMIN_URL: 'https://acta.example.invalid/admin/topics',
      },
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-int-digest-ok',
      ownerToken: 'owner-digest-ok',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl: okFetch,
      },
    });
    expect(digestOk.summary.status).toBe('completed');
    expect(digestOk.summary.receipt).toMatchObject({ sent: true, kind: 'success' });
    expect(await db.pipelineNotification.count({ where: { kind: 'moderation_digest', status: 'accepted' } }))
      .toBeGreaterThan(0);

    let calls = 0;
    const digestFailFetch = jest.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return { ok: true, json: async () => ({ id: 'msg-owner' }) };
      }
      throw new Error('digest transport down');
    }) as unknown as typeof fetch;
    const digestFail = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        RESEND_API_KEY: 're_test',
        PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
        PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
      },
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-int-digest-fail',
      ownerToken: 'owner-digest-fail',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl: digestFailFetch,
      },
    });
    expect(digestFail.summary.status).toBe('completed');
    expect(digestFail.summary.receipt).toMatchObject({ sent: true, kind: 'success' });
    expect(await db.pipelineRun.count({ where: { status: 'completed' } })).toBeGreaterThan(0);
  });
});
