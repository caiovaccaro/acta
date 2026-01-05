import type { FastifyInstance, FastifyReply } from 'fastify';
import {
  getVerdictCard,
  getVerdictHistory,
  getCurrentVerdict,
} from '../services/verdictsService';

export async function verdictsRoutes(fastify: FastifyInstance) {
  // Get verdict history for a question
  fastify.get<{ Params: { questionId: string }; Querystring: { limit?: string } }>(
    '/verdicts/:questionId',
    async (request) => {
      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 12;
      return getVerdictHistory(request.params.questionId, limit);
    }
  );

  // Get current verdict for a question
  fastify.get<{ Params: { questionId: string } }>(
    '/verdicts/:questionId/current',
    async (request, reply: FastifyReply) => {
      const verdict = await getCurrentVerdict(request.params.questionId);
      if (!verdict) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Current verdict not found' } });
      }
      return verdict;
    }
  );

  // Get verdict for a specific month
  fastify.get<{ Params: { questionId: string; month: string } }>(
    '/verdicts/:questionId/:month',
    async (request, reply: FastifyReply) => {
      const verdict = await getVerdictCard(
        request.params.questionId,
        request.params.month
      );
      if (!verdict) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Verdict not found for this month' } });
      }
      return verdict;
    }
  );
}

