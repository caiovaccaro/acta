import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { classifyStance } from '../../analysis/stanceClassifier';
import type { LLMProvider } from '../../llm/provider';
import type { Article, Question } from '@acta/db';

// Mock database functions
jest.mock('@acta/db', () => ({
  findArticleAnalysisAttemptByTriad: jest.fn(),
  createOrUpdateArticleAnalysisAttempt: jest.fn(),
  createArticleStance: jest.fn(),
  findArticleStanceByArticleAndQuestion: jest.fn(),
}));

// Mock month period utility
jest.mock('../../utils/monthPeriod', () => ({
  getCurrentMonthPeriod: jest.fn(() => new Date('2024-01-01')),
}));

describe('classifyStance', () => {
  let mockLLMProvider: jest.Mocked<LLMProvider>;
  let mockArticle: Article;
  let mockQuestion: Question;

  beforeEach(() => {
    jest.clearAllMocks();

    // @ts-expect-error - jest.fn() typing issue, but works at runtime
    const mockClassify = jest.fn().mockResolvedValue({
      stance: 'YesItSeemsSo' as any,
      confidence: 0.85,
      reasoning: 'Test reasoning',
    });

    mockLLMProvider = {
      classifyStance: mockClassify,
      getName: jest.fn().mockReturnValue('openai'),
    } as any;

    mockArticle = {
      id: 'article-1',
      title: 'Test Article',
      textContent: 'Test content',
      url: 'https://example.com/article',
    } as Article;

    mockQuestion = {
      id: 'question-1',
      questionText: 'Is this a test?',
      topicId: 'topic-1',
    } as Question;
  });

  it('classifies stance for article-question pair', async () => {
    const { findArticleAnalysisAttemptByTriad, createOrUpdateArticleAnalysisAttempt, createArticleStance } = require('@acta/db');
    
    // Mock that no existing analysis exists
    findArticleAnalysisAttemptByTriad.mockResolvedValue(null);
    
    // Mock the created analysis attempt
    const mockAnalysisAttempt = { id: 'attempt-1', stance: 'YesItSeemsSo', confidence: 0.85 };
    createOrUpdateArticleAnalysisAttempt.mockResolvedValue(mockAnalysisAttempt);
    createArticleStance.mockResolvedValue({ id: 'stance-1' });

    const result = await classifyStance(
      mockArticle,
      mockQuestion,
      mockLLMProvider
    );

    expect(result.stance).toBe('YesItSeemsSo');
    expect(result.confidence).toBe(0.85);
    expect(result.reasoning).toBe('Test reasoning');
    expect(mockLLMProvider.classifyStance).toHaveBeenCalled();
  });

  it('uses provided month period', async () => {
    const { findArticleAnalysisAttemptByTriad, createOrUpdateArticleAnalysisAttempt, createArticleStance } = require('@acta/db');
    
    findArticleAnalysisAttemptByTriad.mockResolvedValue(null);
    const mockAnalysisAttempt = { id: 'attempt-1', stance: 'YesItSeemsSo', confidence: 0.85 };
    createOrUpdateArticleAnalysisAttempt.mockResolvedValue(mockAnalysisAttempt);
    createArticleStance.mockResolvedValue({ id: 'stance-1' });

    const customMonth = new Date('2024-02-01');
    await classifyStance(mockArticle, mockQuestion, mockLLMProvider, customMonth);

    expect(mockLLMProvider.classifyStance).toHaveBeenCalled();
  });

  it('skips existing analysis when skipExisting is true', async () => {
    const { findArticleAnalysisAttemptByTriad } = require('@acta/db');
    findArticleAnalysisAttemptByTriad.mockResolvedValue({
      id: 'existing-attempt',
      stance: 'NoItDoesntSeemSo',
      confidence: 0.7,
    });

    const result = await classifyStance(
      mockArticle,
      mockQuestion,
      mockLLMProvider,
      undefined,
      { skipExisting: true }
    );

    expect(mockLLMProvider.classifyStance).not.toHaveBeenCalled();
    expect(result.stance).toBe('NoItDoesntSeemSo');
  });
});

