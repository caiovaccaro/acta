import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { healthRoute } from '../routes/health';

// Mock database
jest.mock('@acta/db', () => ({
  connectDatabase: jest.fn(),
  findAllTopics: jest.fn(),
  findTopicById: jest.fn(),
}));

describe('Admin Server', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.get('/health', healthRoute);
  });

  it('should have health endpoint', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('service', 'admin');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should return root endpoint', async () => {
    app.get('/', (req, res) => {
      res.json({ message: 'Acta Admin API', version: '0.0.1' });
    });

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message', 'Acta Admin API');
  });
});

