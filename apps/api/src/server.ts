import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './middleware/logger';
import { registerRoutes } from './routes/index';

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register plugins
  await server.register(helmet);
  await server.register(cors, {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Register middleware
  server.setErrorHandler(errorHandler);
  server.addHook('onRequest', logger);

  // Register routes
  await registerRoutes(server);

  return server;
}


