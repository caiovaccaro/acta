import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ValidationFramework } from '../../validation/framework';
import type { LLMProvider } from '../../llm/provider';

describe('ValidationFramework', () => {
  let mockLLMProvider: any;
  let framework: ValidationFramework;

  beforeEach(() => {
    // @ts-expect-error - jest.fn() typing issue, but works at runtime
    const mockValidate = jest.fn().mockResolvedValue({
      isValid: true,
      overallConfidence: 0.9,
      checks: [
        { name: 'clarity', passed: true, confidence: 0.9, notes: 'Clear' },
        { name: 'specificity', passed: true, confidence: 0.85, notes: 'Specific' },
      ],
      suggestions: [],
    });

    mockLLMProvider = {
      validateQuestion: mockValidate,
      getName: jest.fn().mockReturnValue('openai'),
    };

    framework = new ValidationFramework(mockLLMProvider as LLMProvider);
  });

  describe('constructor', () => {
    it('creates framework with default config', () => {
      const f = new ValidationFramework(mockLLMProvider as LLMProvider);
      expect(f).toBeInstanceOf(ValidationFramework);
    });

    it('creates framework with custom config', () => {
      const f = new ValidationFramework(mockLLMProvider as LLMProvider, {
        requireAllChecks: false,
        minConfidence: 0.8,
      });
      expect(f).toBeInstanceOf(ValidationFramework);
    });
  });

  describe('validate', () => {
    it('validates question successfully', async () => {
      const result = await framework.validate('Is this a test?', 'Test Topic');

      expect(result.isValid).toBe(true);
      expect(result.overallConfidence).toBe(0.9);
      expect(result.checks).toHaveLength(2);
      expect(mockLLMProvider.validateQuestion).toHaveBeenCalledWith({
        question: 'Is this a test?',
        topic: 'Test Topic',
        context: undefined,
      });
    });

    it('includes context when provided', async () => {
      await framework.validate('Is this a test?', 'Test Topic', 'Some context');

      expect(mockLLMProvider.validateQuestion).toHaveBeenCalledWith({
        question: 'Is this a test?',
        topic: 'Test Topic',
        context: 'Some context',
      });
    });

    it('requires all checks when requireAllChecks is true', async () => {
      mockLLMProvider.validateQuestion.mockResolvedValue({
        isValid: false,
        overallConfidence: 0.7,
        checks: [
          { name: 'clarity', passed: true, confidence: 0.9 },
          { name: 'specificity', passed: false, confidence: 0.5 },
        ],
        suggestions: [],
      });

      const result = await framework.validate('Is this a test?', 'Test Topic');

      expect(result.isValid).toBe(false);
    });

    it('passes validation when minConfidence is met', async () => {
      const f = new ValidationFramework(mockLLMProvider as LLMProvider, {
        minConfidence: 0.8,
      });

      const result = await f.validate('Is this a test?', 'Test Topic');

      expect(result.isValid).toBe(true);
    });

    it('fails validation when minConfidence is not met', async () => {
      mockLLMProvider.validateQuestion.mockResolvedValue({
        isValid: true,
        overallConfidence: 0.6,
        checks: [{ name: 'clarity', passed: true, confidence: 0.6 }],
        suggestions: [],
      });

      const f = new ValidationFramework(mockLLMProvider as LLMProvider, {
        minConfidence: 0.8,
      });

      const result = await f.validate('Is this a test?', 'Test Topic');

      expect(result.isValid).toBe(false);
    });
  });

  describe('getLLMProvider', () => {
    it('returns the LLM provider', () => {
      expect(framework.getLLMProvider()).toBe(mockLLMProvider as LLMProvider);
    });
  });
});
