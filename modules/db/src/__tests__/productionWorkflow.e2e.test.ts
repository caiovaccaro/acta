import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { TEST_PIPELINE_EMAIL_FROM, TEST_PIPELINE_EMAIL_TO } from '../../../core/src/notifications/templates';
import { createDefaultStageAdapters } from '../pipeline/sliceAdapters';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_PRODUCTION_WORKFLOW_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('manual dispatch against disposable database', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.pipelineNotification.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('persists a capped slice and sends its receipt', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ id: 'dpl-receipt' }),
    })) as unknown as typeof fetch;
    const result = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=1',
        '--max-analysis-articles=1',
        '--trigger=manual',
      ],
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
      resource: 'p114-e2e-dispatch',
      ownerToken: 'owner-dispatch',
      notificationClient: {
        apiKey: 're_test',
        from: TEST_PIPELINE_EMAIL_FROM,
        to: TEST_PIPELINE_EMAIL_TO,
        fetchImpl,
      },
    });
    expect(result.exitCode).toBe(0);
    expect(result.summary.status).toBe('completed');
    expect(result.summary.receipt.sent).toBe(true);
    expect(await db.pipelineRun.count({ where: { status: 'completed' } })).toBe(1);
    expect(await db.pipelineNotification.count({ where: { status: 'accepted', kind: 'success' } }))
      .toBeGreaterThanOrEqual(1);
  });
});
