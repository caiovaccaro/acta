import { describe, expect, it } from '@jest/globals';
import {
  assertRedactedLedgerRecord,
  estimateCostUsd,
  mapProviderUsage,
  sumEstimatedCostUsd,
  type LlmUsageLedgerRecord,
} from '../../llm/usageLedger';

const prices = {
  pricePerMillionInput: 10,
  pricePerMillionOutput: 30,
};

describe('LLM usage cost mapping', () => {
  it('maps zero tokens to a six-decimal zero', () => {
    expect(estimateCostUsd({
      promptTokens: 0,
      completionTokens: 0,
      ...prices,
    })).toBe('0.000000');
  });

  it('maps one million input tokens at $10 to ten dollars', () => {
    expect(estimateCostUsd({
      promptTokens: 1_000_000,
      completionTokens: 0,
      ...prices,
    })).toBe('10.000000');
  });

  it('maps mixed tokens with fixed precision', () => {
    expect(estimateCostUsd({
      promptTokens: 100,
      completionTokens: 20,
      ...prices,
    })).toBe('0.001600');
  });

  it('rounds half up at the sixth decimal', () => {
    expect(estimateCostUsd({
      promptTokens: 3,
      completionTokens: 0,
      pricePerMillionInput: 2.5,
      pricePerMillionOutput: 0,
    })).toBe('0.000008');
  });

  it('maps provider usage to redacted metadata', () => {
    const record = mapProviderUsage({
      operation: 'classifyStance',
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      promptTokens: 100,
      completionTokens: 20,
      providerRequestId: 'chatcmpl-test',
      pipelineRunId: 'run-1',
      stage: 'stance_classification',
      ...prices,
    });

    expect(record).toEqual({
      operation: 'classifyStance',
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      promptTokens: 100,
      completionTokens: 20,
      estimatedCostUsd: '0.001600',
      providerRequestId: 'chatcmpl-test',
      pipelineRunId: 'run-1',
      stage: 'stance_classification',
    });
    expect(Object.keys(record).sort()).toEqual([
      'completionTokens',
      'estimatedCostUsd',
      'model',
      'operation',
      'pipelineRunId',
      'promptTokens',
      'provider',
      'providerRequestId',
      'stage',
    ]);
    expect(record).not.toHaveProperty('prompt');
    expect(record).not.toHaveProperty('completion');
    expect(record).not.toHaveProperty('messages');
    expect(record).not.toHaveProperty('apiKey');
    expect(record).not.toHaveProperty('textContent');
    expect(JSON.stringify(record)).not.toMatch(/sk-/);
  });

  it('rejects unexpected ledger fields', () => {
    const dirty = {
      operation: 'classifyStance',
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      promptTokens: 1,
      completionTokens: 0,
      estimatedCostUsd: '0.000010',
      providerRequestId: null,
      pipelineRunId: null,
      stage: null,
      prompt: 'secret article text',
    } as unknown as LlmUsageLedgerRecord;
    expect(() => assertRedactedLedgerRecord(dirty)).toThrow(/unexpected field/);
  });

  it('sums ledger costs without floating error', () => {
    expect(sumEstimatedCostUsd(['0.001600', '0.000008'])).toBe('0.001608');
  });
});
