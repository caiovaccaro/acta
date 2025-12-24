import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getTimelineEvents,
  generateTimelineEvents,
} from '../services/timelineService.js';

export async function timelineRoutes(fastify: FastifyInstance) {
  // Get timeline events for a topic or question
  fastify.get<{
    Querystring: { topicId?: string; questionId?: string; generate?: string };
  }>('/timeline', async (request) => {
    const { topicId, questionId, generate } = request.query;
    const shouldGenerate = generate === 'true';

    if (shouldGenerate) {
      return generateTimelineEvents(topicId, questionId);
    }

    return getTimelineEvents(topicId, questionId);
  });
}

