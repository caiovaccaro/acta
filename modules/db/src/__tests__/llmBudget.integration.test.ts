import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { LLMBudgetExceededError } from '../../../core/src/llm/errors';
import { monthSpend, reserveLlmBudget } from '../repositories/llmBudgetRepository';

const describeDatabase = process.env.RUN_LLM_BUDGET_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('LLM budget reservation integration', () => {
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

  it('never lets concurrent reservations exceed the ceiling', async () => {
    const run = await db.pipelineRun.create({ data: { trigger: 'manual' } });
    const expiresAt = new Date(Date.now() + 60_000);
    const attempts = await Promise.allSettled([
      reserveLlmBudget({
        operation: 'classifyStance',
        pipelineRunId: run.id,
        expiresAt,
        ceilingUsd: '0.080000',
        reservedCostUsd: '0.050000',
      }, db),
      reserveLlmBudget({
        operation: 'classifyStance',
        pipelineRunId: run.id,
        expiresAt,
        ceilingUsd: '0.080000',
        reservedCostUsd: '0.050000',
      }, db),
    ]);

    const accepted = attempts.filter((result) => result.status === 'fulfilled');
    const rejected = attempts.filter((result) => result.status === 'rejected');
    expect(accepted).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(LLMBudgetExceededError);

    const spend = await monthSpend(new Date().toISOString().slice(0, 7), db);
    expect(spend.reservedUsd).toBe('0.050000');
    expect(spend.settledUsd).toBe('0.000000');
  });
});
