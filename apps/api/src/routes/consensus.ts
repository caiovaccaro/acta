import type { FastifyInstance, FastifyReply } from 'fastify';
import { getConsensusThermometer } from '../services/consensusService.js';

export async function consensusRoutes(fastify: FastifyInstance) {
  // Get consensus thermometer
  fastify.get<{ Params: { questionId: string }; Querystring: { month?: string } }>(
    '/consensus/:questionId/thermometer',
    async (request, reply: FastifyReply) => {
      const thermometer = await getConsensusThermometer(
        request.params.questionId,
        request.query.month
      );
      if (!thermometer) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Consensus data not found' } });
      }
      return thermometer;
    }
  );
}

