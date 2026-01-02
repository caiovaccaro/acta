import type { FastifyInstance } from 'fastify';
import { getAllQuestions, getQuestionById } from '../services/questionsService.js';

export async function questionsRoutes(fastify: FastifyInstance) {
  // Get all active questions with topics and verdicts
  fastify.get('/questions', async () => {
    return getAllQuestions();
  });

  // Get a question by ID
  fastify.get<{ Params: { id: string } }>('/questions/:id', async (request, reply) => {
    const question = await getQuestionById(request.params.id);
    if (!question) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Question not found' } });
    }
    return question;
  });
}

