import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { OpenAIProvider } from '../../llm/providers/openaiProvider';
import {
  LLMProviderError,
  LLMRateLimitError,
  LLMInvalidKeyError,
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
});

