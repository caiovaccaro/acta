import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { LLMBudgetExceededError } from '../../../core/src/llm/errors';
import { createDefaultStageAdapters } from '../pipeline/sliceAdapters';
import { runPipelineSlice } from '../pipeline/runSlice';

const describeDatabase = process.env.RUN_LLM_BUDGET_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('budget exhaustion slice E2E', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.llmBudgetReservation.deleteMany();
    await db.llmUsage.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('pauses paid stages and continues deterministic work when the ceiling is exhausted', async () => {
    const adapters = createDefaultStageAdapters();
    adapters.stance_classification = {
      stage: 'stance_classification',
      async run() {
        throw new LLMBudgetExceededError();
      },
    };

    const result = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=1',
        '--max-analysis-articles=1',
        '--trigger=manual',
      ],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        ACTA_LLM_MONTHLY_CEILING_USD: '0.010000',
      },
      db,
      resource: 'p109-e2e-budget',
      ownerToken: 'owner-budget',
      adapters,
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary.status).toBe('paused_budget');
    expect(result.summary.budget).toMatchObject({
      enforced: true,
      ceilingUsd: '0.010000',
      paused: true,
    });
    const rss = result.summary.stages.find((stage) => stage.stage === 'rss_refresh');
    const paid = result.summary.stages.find((stage) => stage.stage === 'stance_classification');
    const verdict = result.summary.stages.find((stage) => stage.stage === 'verdict_recalculation');
    const finalize = result.summary.stages.find((stage) => stage.stage === 'finalize');
    expect(rss?.status).toBe('completed');
    expect(paid?.status).toBe('paused_budget');
    expect(verdict?.status).toBe('completed');
    expect(finalize?.status).toBe('completed');
    expect(finalize?.metrics).toMatchObject({
      receipt: { sent: false, reason: 'email_out_of_scope' },
    });
  });
});
