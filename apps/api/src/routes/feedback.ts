import type { FastifyInstance } from 'fastify';
import { createFeedback } from '../services/feedbackService';
import type { FeedbackCreateDTO } from '@acta/shared';

export async function feedbackRoutes(fastify: FastifyInstance) {
  // Create feedback
  fastify.post<{ Body: FeedbackCreateDTO }>('/feedback', async (request) => {
    return createFeedback(request.body);
  });
}




