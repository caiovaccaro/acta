import type { FastifyInstance } from 'fastify';
import { getTransparencyData } from '../services/transparencyService';

export async function transparencyRoutes(fastify: FastifyInstance) {
  // Get transparency data (outlets and methodology)
  fastify.get('/transparency/outlets', async () => {
    return getTransparencyData();
  });

  // Get methodology
  fastify.get('/transparency/methodology', async () => {
    const data = await getTransparencyData();
    return data.methodology;
  });
}


