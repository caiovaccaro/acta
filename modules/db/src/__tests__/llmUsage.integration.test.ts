import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { OpenAIProvider } from '@acta/core';
import { createLlmUsageSink } from '../repositories/llmUsageRepository';

const describeDatabase = process.env.RUN_LLM_USAGE_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('LLM usage repository integration', () => {
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

  it('persists exactly one usage row for one mocked provider response', async () => {
    const run = await db.pipelineRun.create({ data: { trigger: 'manual' } });
    const create = jest.fn(async () => ({
      id: 'chatcmpl-integration',
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
      usageContext: { pipelineRunId: run.id, stage: 'stance_classification' },
      onUsage: createLlmUsageSink(db),
      client: { chat: { completions: { create } } } as never,
    });

    await provider.classifyStance({
      article: {
        id: 'article-1',
        title: 'Fixture',
        textContent: 'PROMPT_TEXT_MUST_NOT_PERSIST',
      } as never,
      question: { id: 'question-1', questionText: 'Is this a test?' } as never,
      month: new Date(),
    });

    const rows = await db.llmUsage.findMany({ where: { pipelineRunId: run.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      pipelineRunId: run.id,
      stage: 'stance_classification',
      operation: 'classifyStance',
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      promptTokens: 100,
      completionTokens: 20,
      providerRequestId: 'chatcmpl-integration',
    });
    expect(rows[0].estimatedCostUsd.toFixed(6)).toBe('0.001600');
    expect(JSON.stringify(rows[0])).not.toMatch(/PROMPT_TEXT_MUST_NOT_PERSIST/);
  });
});
