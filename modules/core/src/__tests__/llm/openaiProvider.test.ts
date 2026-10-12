import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OpenAIProvider } from '../../llm/providers/openaiProvider';
import {
  LLMProviderError,
  LLMRateLimitError,
  LLMInvalidKeyError,
  LLMUsagePersistError,
  LLMBudgetExceededError,
} from '../../llm/errors';

// Mock OpenAI
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;
  let mockOpenAI: any;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider({
      apiKey: 'test-api-key',
      model: 'gpt-4-turbo-preview',
    });
    mockOpenAI = (provider as any).client;
  });

  describe('constructor', () => {
    it('throws error when API key is missing', () => {
      expect(() => {
        new OpenAIProvider({ apiKey: '' });
      }).toThrow('OpenAI API key is required');
    });

    it('creates provider with default model', () => {
      const p = new OpenAIProvider({ apiKey: 'test-key' });
      expect((p as any).model).toBe('gpt-4-turbo-preview');
    });

    it('creates provider with custom model', () => {
      const p = new OpenAIProvider({
        apiKey: 'test-key',
        model: 'gpt-4',
      });
      expect((p as any).model).toBe('gpt-4');
    });
  });

  describe('getName', () => {
    it('returns provider name', () => {
      expect(provider.getName()).toBe('openai');
    });
  });

  describe('classifyStance', () => {
    it('classifies stance correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                stance: 'YesItSeemsSo',
                confidence: 0.85,
                reasoning: 'Test reasoning',
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await provider.classifyStance({
        article: {
          id: 'article-1',
          title: 'Test Article',
          textContent: 'Test content',
        } as any,
        question: {
          id: 'question-1',
          questionText: 'Is this a test?',
        } as any,
        month: new Date(),
      });

      expect(result.stance).toBe('YesItSeemsSo');
      expect(result.confidence).toBe(0.85);
      expect(result.reasoning).toBe('Test reasoning');
    });

    it('handles API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(
        new Error('API Error')
      );

      await expect(
        provider.classifyStance({
          article: { id: 'article-1', title: 'Test', textContent: 'Test' } as any,
          question: { id: 'q1', questionText: 'Test?' } as any,
          month: new Date(),
        })
      ).rejects.toThrow();
    });
  });

  describe('validateQuestion', () => {
    it('validates question correctly', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                isValid: true,
                overallConfidence: 0.9,
                checks: [
                  { name: 'clarity', passed: true, confidence: 0.9 },
                ],
                suggestions: [],
              }),
            },
          },
        ],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await provider.validateQuestion({
        question: 'Is this a test?',
        topic: 'Test Topic',
      });

      expect(result.isValid).toBe(true);
      expect(result.overallConfidence).toBe(0.9);
    });
  });

  describe('usage ledger callback', () => {
    const stanceParams = {
      article: {
        id: 'article-1',
        title: 'Test Article',
        textContent: 'SECRET_ARTICLE_TEXT',
      } as any,
      question: {
        id: 'question-1',
        questionText: 'Is this a test?',
      } as any,
      month: new Date(),
    };

    function mockCompletion() {
      return {
        id: 'chatcmpl-ledger',
        model: 'gpt-4-turbo-preview',
        usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
        choices: [
          {
            message: {
              content: JSON.stringify({
                stance: 'YesItSeemsSo',
                confidence: 0.85,
                reasoning: 'Test reasoning',
              }),
            },
          },
        ],
      };
    }

    it('records redacted usage after a successful completion', async () => {
      const records: unknown[] = [];
      const ledgerProvider = new OpenAIProvider({
        apiKey: 'test-api-key',
        model: 'gpt-4-turbo-preview',
        usageContext: { pipelineRunId: 'run-1', stage: 'stance_classification' },
        onUsage: async (record) => {
          records.push(record);
        },
      });
      const client = (ledgerProvider as any).client;
      client.chat.completions.create.mockResolvedValue(mockCompletion());

      await ledgerProvider.classifyStance(stanceParams);

      expect(records).toHaveLength(1);
      expect(records[0]).toEqual({
        operation: 'classifyStance',
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        promptTokens: 100,
        completionTokens: 20,
        estimatedCostUsd: '0.001600',
        providerRequestId: 'chatcmpl-ledger',
        pipelineRunId: 'run-1',
        stage: 'stance_classification',
      });
      expect(JSON.stringify(records[0])).not.toMatch(/SECRET_ARTICLE_TEXT|sk-|apiKey/);
    });

    it('blocks further paid requests after persist failure', async () => {
      const ledgerProvider = new OpenAIProvider({
        apiKey: 'test-api-key',
        onUsage: async () => {
          throw new Error('db down');
        },
      });
      const client = (ledgerProvider as any).client;
      client.chat.completions.create.mockResolvedValue(mockCompletion());

      await expect(ledgerProvider.classifyStance(stanceParams)).rejects.toBeInstanceOf(
        LLMUsagePersistError,
      );
      expect(client.chat.completions.create).toHaveBeenCalledTimes(1);

      await expect(ledgerProvider.classifyStance(stanceParams)).rejects.toBeInstanceOf(
        LLMUsagePersistError,
      );
      expect(client.chat.completions.create).toHaveBeenCalledTimes(1);
    });

    it('does not send a paid request when reservation is rejected', async () => {
      const ledgerProvider = new OpenAIProvider({
        apiKey: 'test-api-key',
        onReserve: async () => {
          throw new LLMBudgetExceededError();
        },
      });
      const client = (ledgerProvider as any).client;
      client.chat.completions.create.mockResolvedValue(mockCompletion());

      await expect(ledgerProvider.classifyStance(stanceParams)).rejects.toBeInstanceOf(
        LLMBudgetExceededError,
      );
      expect(client.chat.completions.create).not.toHaveBeenCalled();
    });
  });
});

