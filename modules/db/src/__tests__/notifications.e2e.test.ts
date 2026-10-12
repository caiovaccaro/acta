import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TEST_PIPELINE_EMAIL_FROM, TEST_PIPELINE_EMAIL_TO } from '../../../core/src/notifications/templates';
import { createDefaultStageAdapters } from '../pipeline/sliceAdapters';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_NOTIFICATION_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('slice receipt E2E', () => {
  const db = new PrismaClient();
  const inbox: Array<{ subject: string; text: string }> = [];

  beforeEach(async () => {
    inbox.length = 0;
    await db.pipelineNotification.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('delivers one complete receipt for success and one for terminal failure', async () => {
    const fetchImpl = jest.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as { subject: string; text: string };
      inbox.push({ subject: body.subject, text: body.text });
      return {
        ok: true,
        json: async () => ({ id: `msg-${inbox.length}` }),
      };
    }) as unknown as typeof fetch;
    const client = {
      apiKey: 're_test',
      from: TEST_PIPELINE_EMAIL_FROM,
      to: TEST_PIPELINE_EMAIL_TO,
      fetchImpl,
    };
    const env = {
      DATABASE_URL: process.env.DATABASE_URL,
      RESEND_API_KEY: 're_test',
      PIPELINE_EMAIL_FROM: TEST_PIPELINE_EMAIL_FROM,
      PIPELINE_EMAIL_TO: TEST_PIPELINE_EMAIL_TO,
      ACTA_PUBLIC_URL: 'https://acta.example.invalid',
      ACTA_ADMIN_URL: 'https://acta.example.invalid/admin/topics',
    };

    const success = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env,
      db,
      adapters: createDefaultStageAdapters(),
      resource: 'p113-e2e-success',
      ownerToken: 'owner-success',
      notificationClient: client,
    });
    expect(success.exitCode).toBe(0);
    expect(success.summary.receipt.sent).toBe(true);
    expect(inbox[0]?.subject).toContain('[Acta] Pipeline completed');
    expect(inbox[0]?.text).toContain('https://acta.example.invalid');
    expect(inbox[0]?.text).toContain('/admin/topics');

    const adapters = createDefaultStageAdapters();
    adapters.preflight = {
      stage: 'preflight',
      async run() {
        return {
          kind: 'failed_terminal',
          errorCode: 'FORCED_FAILURE',
          errorMessage: 'forced terminal provider sk-secretvalue',
        };
      },
    };
    const failure = await runPipelineSlice({
      argv: ['--max-runtime-minutes=285', '--max-new-articles=1', '--max-analysis-articles=1', '--trigger=manual'],
      env,
      db,
      adapters,
      resource: 'p113-e2e-failure',
      ownerToken: 'owner-failure',
      notificationClient: client,
    });
    expect(failure.exitCode).toBe(1);
    expect(failure.summary.status).toBe('failed_terminal');
    expect(failure.summary.receipt.sent).toBe(true);
    const failureMail = inbox.find((row) => row.subject.includes('Pipeline failed'));
    expect(failureMail).toBeTruthy();
    expect(JSON.stringify(inbox)).not.toContain(TEST_PIPELINE_EMAIL_TO);
    expect(JSON.stringify(inbox)).not.toMatch(/sk-/i);
  });
});
