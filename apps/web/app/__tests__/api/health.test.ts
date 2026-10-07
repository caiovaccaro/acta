jest.mock('@acta/db', () => ({
  prisma: {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  },
}));

// Mock Next.js server components
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

import { GET } from '../../api/health/route';

describe('GET /api/health', () => {
  it('returns health status', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('service', 'web');
  });

  it('includes version in response', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body).toHaveProperty('version');
  });
});

