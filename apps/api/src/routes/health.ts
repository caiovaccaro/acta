import type { FastifyInstance } from 'fastify';
import { prisma } from '@acta/db';
import type { HealthResponse, StatusResponse } from '@acta/shared';

export async function healthRoutes(fastify: FastifyInstance) {
  // Health check
  fastify.get('/health', async () => {
    let databaseStatus: 'connected' | 'disconnected' = 'disconnected';
    
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseStatus = 'connected';
    } catch (error) {
      // Database not connected
    }

    const response: HealthResponse = {
      status: databaseStatus === 'connected' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database: databaseStatus,
    };

    return response;
  });

  // Status endpoint
  fastify.get('/status', async () => {
    // TODO: Get actual last crawl/analysis/verdict calculation times
    // For now, return placeholder
    const response: StatusResponse = {
      lastCrawl: null,
      lastAnalysis: null,
      lastVerdictCalculation: null,
    };

    return response;
  });
}


