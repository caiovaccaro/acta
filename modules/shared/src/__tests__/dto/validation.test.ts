import { describe, it, expect } from '@jest/globals';
import type {
  TopicDTO,
  QuestionCardDTO,
  VerdictDTO,
} from '../../index';

describe('DTO Validation', () => {
  describe('TopicDTO', () => {
    it('has required fields', () => {
      const topic: TopicDTO = {
        id: 'topic-1',
        name: 'Test Topic',
        description: 'Test description',
        safetyNoteRequired: false,
        questionCount: 5,
        activeQuestionCount: 3,
        createdAt: new Date().toISOString(),
      };

      expect(topic.id).toBeDefined();
      expect(topic.name).toBeDefined();
      expect(topic.questionCount).toBeDefined();
    });
  });

  describe('QuestionCardDTO', () => {
    it('has required fields', () => {
      const question: QuestionCardDTO = {
        id: 'question-1',
        questionText: 'Is this a test?',
        topicId: 'topic-1',
        topicName: 'Test Topic',
        isActive: true,
        outlets: [],
      };

      expect(question.id).toBeDefined();
      expect(question.questionText).toBeDefined();
      expect(question.topicId).toBeDefined();
    });
  });

  describe('VerdictDTO', () => {
    it('has required fields', () => {
      const verdict: VerdictDTO = {
        id: 'verdict-1',
        questionId: 'question-1',
        questionText: 'Is this a test?',
        topicId: 'topic-1',
        topicName: 'Test Topic',
        month: '2024-01-01',
        verdictLabel: 'YesItSeemsSo',
        confidence: 85,
        supportShare: 0.75,
        variance: 0.2,
        reasoning: null,
        articleCount: 10,
        outletCount: 5,
        calculatedAt: new Date().toISOString(),
      };

      expect(verdict.id).toBeDefined();
      expect(verdict.verdictLabel).toBeDefined();
      expect(verdict.confidence).toBeDefined();
    });
  });
});

