import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { OpenAIProvider } from '@acta/core';
import { createDefaultStageAdapters } from '../pipeline/sliceAdapters';
import { runPipelineSlice } from '../pipeline/runSlice';
import { createLlmUsageSink, sumLlmUsageForRun } from '../repositories/llmUsageRepository';

const describeDatabase = process.env.RUN_LLM_USAGE_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('capped fixture analysis ledger E2E', () => {
  jest.setTimeout(30_000);
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.llmUsage.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('includes the same ledger cost in the slice summary without storing prompt content', async () => {
    const create = jest.fn(async () => ({
      id: 'chatcmpl-e2e',
      model: 'gpt-4-turbo-preview',
      usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
      choices: [
        {
          message: {
            content: JSON.stringify({
              stance: 'YesItSeemsSo',
              confidence: 0.8,
              reasoning: 'fixture',
            }),
          },
        },
      ],
    }));
    const provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-4-turbo-preview',
      onUsage: createLlmUsageSink(db),
      client: { chat: { completions: { create } } } as never,
    });

    const adapters = createDefaultStageAdapters();
    adapters.stance_classification = {
      stage: 'stance_classification',
      async run(context) {
        provider.setUsageContext({
          pipelineRunId: context.runId,
          stage: context.stage,
        });
        await provider.classifyStance({
          article: {
            id: 'article-1',
            title: 'Fixture article',
            textContent: 'PROMPT_CONTENT_MUST_NOT_BE_STORED',
          } as never,
          question: { id: 'question-1', questionText: 'Is this a test?' } as never,
          month: new Date(),
        });
        await context.checkpoint({ id: 'article-1' }, { processed: 1 });
        return { kind: 'completed', metrics: { processed: 1 } };
      },
    };

    const result = await runPipelineSlice({
      argv: [
        '--max-runtime-minutes=285',
        '--max-new-articles=1',
        '--max-analysis-articles=1',
        '--trigger=manual',
      ],
      db,
      resource: 'p108-e2e-ledger',
      ownerToken: 'owner-ledger',
      adapters,
    });

    expect(result.exitCode).toBe(0);
    expect(result.summary.status).toBe('completed');
    const ledger = await sumLlmUsageForRun(result.summary.runId!, db);
    expect(result.summary.ledger).toEqual(ledger);
    expect(result.summary.ledger).toEqual({
      estimatedCostUsd: '0.001600',
      requestCount: 1,
    });
    expect(result.summary.receipt).toEqual({
      sent: false,
      reason: 'email_out_of_scope',
    });

    const rows = await db.llmUsage.findMany({
      where: { pipelineRunId: result.summary.runId! },
    });
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0])).not.toMatch(/PROMPT_CONTENT_MUST_NOT_BE_STORED/);
    expect(JSON.stringify(result.summary)).not.toMatch(/PROMPT_CONTENT_MUST_NOT_BE_STORED/);
  });
});
