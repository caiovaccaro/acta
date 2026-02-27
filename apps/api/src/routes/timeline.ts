import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getTimelineEvents,
} from '../services/timelineService';

export async function timelineRoutes(fastify: FastifyInstance) {
  // Get timeline events for a topic or question
  fastify.get<{
    Querystring: { topicId?: string; questionId?: string };
  }>('/timeline', async (request) => {
    const { topicId, questionId } = request.query;

    return getTimelineEvents(topicId, questionId, true);
  });
}

