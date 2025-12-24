import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import type { ErrorResponse } from '@acta/shared';

export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Log error for debugging
  request.log.error({
    err: error,
    url: request.url,
    method: request.method,
  }, 'Request error');

  const errorResponse: ErrorResponse = {
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    },
  };

  reply.status(statusCode).send(errorResponse);
}


