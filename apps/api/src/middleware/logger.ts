import type { FastifyRequest, FastifyReply } from 'fastify';

export async function logger(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log request
  request.log.info({
    method: request.method,
    url: request.url,
    ip: request.ip,
  }, 'Incoming request');

  // Log response when done - attach to reply's onSend hook
  const originalSend = reply.send.bind(reply);
  reply.send = function (payload?: unknown) {
    request.log.info({
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
    }, 'Request completed');
    return originalSend(payload);
  };
}

