import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { buildServer } from '../../server';
import type { FastifyInstance } from 'fastify';
import * as topicsService from '../../services/topicsService';

jest.mock('../../services/topicsService');

describe('Topics Routes', () => {
  let server: FastifyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    server = await buildServer();
  });

  afterEach(async () => {
    await server.close();
  });

  describe('GET /api/topics', () => {
    it('returns list of topics', async () => {
      const mockTopics = [
        { id: 'topic-1', name: 'Test Topic', questionCount: 5 },
      ];

      (topicsService.getAllTopics as jest.MockedFunction<any>).mockResolvedValue(mockTopics);

      const response = await server.inject({
        method: 'GET',
        url: '/api/topics',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
    });

    it('handles includeInactive query parameter', async () => {
      (topicsService.getAllTopics as jest.MockedFunction<any>).mockResolvedValue([]);

      const response = await server.inject({
        method: 'GET',
        url: '/api/topics?includeInactive=true',
      });

      expect(response.statusCode).toBe(200);
      expect(topicsService.getAllTopics).toHaveBeenCalledWith(true);
    });
  });

  describe('GET /api/topics/:id', () => {
    it('returns topic details', async () => {
      const mockTopic = {
        id: 'topic-1',
        name: 'Test Topic',
        questions: [],
      };

      (topicsService.getTopicById as jest.MockedFunction<any>).mockResolvedValue(mockTopic);

      const response = await server.inject({
        method: 'GET',
        url: '/api/topics/topic-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe('topic-1');
    });

    it('returns 404 for non-existent topic', async () => {
      (topicsService.getTopicById as jest.MockedFunction<any>).mockResolvedValue(null);

      const response = await server.inject({
        method: 'GET',
        url: '/api/topics/non-existent',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});

