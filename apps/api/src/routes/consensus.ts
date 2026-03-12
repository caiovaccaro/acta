import type { FastifyInstance, FastifyReply } from 'fastify';
import { getConsensusThermometer, getQuestionCountryStances } from '../services/consensusService';

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

  // Get country stances for world map
  fastify.get<{ Params: { questionId: string }; Querystring: { month?: string } }>(
    '/consensus/:questionId/country-stances',
    async (request, reply: FastifyReply) => {
      const countries = await getQuestionCountryStances(
        request.params.questionId,
        request.query.month
      );
      if (!countries || countries.length === 0) {
        return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Country stances not found' } });
      }
      return countries;
    }
  );
}

