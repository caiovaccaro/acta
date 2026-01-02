import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  getAllTopics,
  getTopicById,
  getTopicVerdict,
} from '../services/topicsService.js';

export async function topicsRoutes(fastify: FastifyInstance) {
  // Get all topics
  fastify.get<{ Querystring: { includeInactive?: string } }>('/topics', async (request) => {
    const includeInactive = request.query.includeInactive === 'true';
    return getAllTopics(includeInactive);
  });

  // Get topic by ID
  fastify.get<{ Params: { id: string } }>('/topics/:id', async (request, reply) => {
    const topic = await getTopicById(request.params.id);
    if (!topic) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Topic not found' } });
    }
    return topic;
  });

  // Get topic verdict
  fastify.get<{ Params: { id: string } }>('/topics/:id/verdict', async (request, reply) => {
    const verdict = await getTopicVerdict(request.params.id);
    if (!verdict) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Verdict not found for this topic' } });
    }
    return verdict;
  });
}

