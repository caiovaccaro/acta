import type { FastifyInstance, FastifyReply } from 'fastify';
import { getDebateCard } from '../services/debateService';

export async function debateRoutes(fastify: FastifyInstance) {
  // Get debate card
  fastify.get<{ Params: { questionId: string }; Querystring: { month?: string } }>(
    '/debate/:questionId',
    async (request, reply: FastifyReply) => {
      const debateCard = await getDebateCard(
        request.params.questionId,
        request.query.month
      );
      if (!debateCard) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Debate card not found' } });
      }
      return debateCard;
    }
  );
}

