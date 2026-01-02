import type { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.js';
import { topicsRoutes } from './topics.js';
import { questionsRoutes } from './questions.js';
import { verdictsRoutes } from './verdicts.js';
import { consensusRoutes } from './consensus.js';
import { debateRoutes } from './debate.js';
import { transparencyRoutes } from './transparency.js';
import { feedbackRoutes } from './feedback.js';

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

