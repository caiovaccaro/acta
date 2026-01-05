import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health';
import { topicsRoutes } from './topics';
import { questionsRoutes } from './questions';
import { verdictsRoutes } from './verdicts';
import { consensusRoutes } from './consensus';
import { debateRoutes } from './debate';
import { transparencyRoutes } from './transparency';
import { feedbackRoutes } from './feedback';

export async function registerRoutes(fastify: FastifyInstance) {
  // Register all route modules
  await fastify.register(healthRoutes, { prefix: '/api' });
  await fastify.register(topicsRoutes, { prefix: '/api' });
  await fastify.register(questionsRoutes, { prefix: '/api' });
  await fastify.register(verdictsRoutes, { prefix: '/api' });
  await fastify.register(consensusRoutes, { prefix: '/api' });
  await fastify.register(debateRoutes, { prefix: '/api' });
  await fastify.register(transparencyRoutes, { prefix: '/api' });
  await fastify.register(feedbackRoutes, { prefix: '/api' });
}

