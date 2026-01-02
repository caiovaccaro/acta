import { describe, it, expect, jest } from '@jest/globals';
import { errorHandler } from '../../middleware/errorHandler';
import type { FastifyRequest, FastifyReply, FastifyError } from 'fastify';

describe('errorHandler', () => {
  it('handles errors correctly', async () => {
    const mockRequest = {
      log: {
        error: jest.fn(),
      },
      url: '/test',
      method: 'GET',
    } as unknown as FastifyRequest;

    const mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;

    const error = {
      message: 'Test error',
      statusCode: 500,
    } as FastifyError;

    await errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalled();
  });

  it('handles custom error status codes', async () => {
    const mockRequest = {
      log: {
        error: jest.fn(),
      },
      url: '/test',
      method: 'GET',
    } as unknown as FastifyRequest;

    const mockReply = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as FastifyReply;

    const error = {
      message: 'Not found',
      statusCode: 404,
    } as FastifyError;

    await errorHandler(error, mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(404);
  });
});

