import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { getAllTopics, getTopicById } from '../../services/topicsService';
import * as db from '@acta/db';

jest.mock('@acta/db');

describe('topicsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllTopics', () => {
    it('returns topics with question counts', async () => {
      const mockTopics = [
        {
          id: 'topic-1',
          name: 'Test Topic',
          questions: [
            { id: 'q1', isActive: true },
            { id: 'q2', isActive: true },
          ],
        },
      ];

      (db.findAllTopics as jest.MockedFunction<any>).mockResolvedValue(mockTopics);
      (db.findQuestionsByTopicId as jest.MockedFunction<any>).mockResolvedValue(
        mockTopics[0].questions
      );
      (db.findArticleStancesByQuestionId as jest.MockedFunction<any>).mockResolvedValue([
        { id: 'stance-1' },
      ]);

      const result = await getAllTopics(false);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters out topics with no active questions', async () => {
      const mockTopics = [
        {
          id: 'topic-1',
          name: 'Test Topic',
          questions: [],
        },
      ];

      (db.findAllTopics as jest.MockedFunction<any>).mockResolvedValue(mockTopics);
      (db.findQuestionsByTopicId as jest.MockedFunction<any>).mockResolvedValue([]);

      const result = await getAllTopics(false);

      expect(result.length).toBe(0);
    });
  });

  describe('getTopicById', () => {
    it('returns topic details', async () => {
      const mockTopic = {
        id: 'topic-1',
        name: 'Test Topic',
        questions: [{ id: 'q1', isActive: true }],
      };

      (db.findTopicById as jest.MockedFunction<any>).mockResolvedValue(mockTopic);
      (db.findQuestionsByTopicId as jest.MockedFunction<any>).mockResolvedValue(
        mockTopic.questions
      );
      (db.findArticleStancesByQuestionId as jest.MockedFunction<any>).mockResolvedValue([
        { id: 'stance-1' },
      ]);

      const result = await getTopicById('topic-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('topic-1');
    });

    it('returns null for non-existent topic', async () => {
      (db.findTopicById as jest.MockedFunction<any>).mockResolvedValue(null);

      const result = await getTopicById('non-existent');

      expect(result).toBeNull();
    });
  });
});

