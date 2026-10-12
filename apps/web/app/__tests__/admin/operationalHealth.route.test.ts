/**
 * @jest-environment node
 */
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
}));

const loadOperationalHealth = jest.fn();
jest.mock('@acta/db', () => ({
  loadOperationalHealth: (...args: unknown[]) => loadOperationalHealth(...args),
  redactHealthError: () => 'internal_error',
}));

jest.mock('@/lib/prisma', () => ({ prisma: {} }));

import { ADMIN_SESSION_COOKIE, createSessionToken } from '../../../lib/adminAuth';
import { GET } from '../../admin/api/health/route';

describe('GET /admin/api/health', () => {
  const email = 'admin@acta.app';
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.ADMIN_EMAIL = email;
    process.env.ADMIN_PASSWORD = 'secret';
    process.env.ADMIN_SESSION_SECRET = secret;
  });

  beforeEach(() => {
    loadOperationalHealth.mockReset();
  });

  it('omits operational data without a session', async () => {
    const response = await GET(new Request('http://localhost/admin/api/health'));
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body).toEqual({ authorized: false, overall: 'unauthorized' });
    expect(body).not.toHaveProperty('queues');
    expect(loadOperationalHealth).not.toHaveBeenCalled();
  });

  it('returns operational data for an authenticated session', async () => {
    loadOperationalHealth.mockResolvedValue({
      authorized: true,
      overall: 'stale',
      run: { status: 'stale', lastStatus: 'running' },
      freshness: { status: 'stale' },
      queues: { status: 'ok', pending: 2, inProgress: 0, failed: 1 },
      moderation: { status: 'ok', topicsPending: 3, questionsPending: 1 },
      budget: { status: 'ok', remainingUsd: '12.000000', ceilingUsd: '30.000000' },
    });
    const token = createSessionToken(email);
    const response = await GET(new Request('http://localhost/admin/api/health', {
      headers: { cookie: `${ADMIN_SESSION_COOKIE}=${token}` },
    }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.authorized).toBe(true);
    expect(body.queues.pending).toBe(2);
    expect(body.moderation.topicsPending).toBe(3);
    expect(body.budget.remainingUsd).toBe('12.000000');
  });
});
