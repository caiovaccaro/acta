/**
 * @jest-environment node
 */
// Mock Next.js server response
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      cookies: { set: jest.fn() },
    })),
  },
}));

import { ADMIN_SESSION_COOKIE, createSessionToken } from '../../../lib/adminAuth';
import { POST as login } from '../../admin/api/auth/login/route';
import { POST as logout } from '../../admin/api/auth/logout/route';
import { GET as session } from '../../admin/api/auth/session/route';

describe('admin auth routes', () => {
  const email = 'admin@acta.app';
  const password = 'secret';
  const secret = 'test-secret';

  beforeAll(() => {
    process.env.ADMIN_EMAIL = email;
    process.env.ADMIN_PASSWORD = password;
    process.env.ADMIN_SESSION_SECRET = secret;
  });

  it('rejects invalid login', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email, password: 'wrong' }),
    });
    const response = await login(request);
    expect(response.status).toBe(401);
  });

  it('accepts valid login and sets session cookie', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const response: any = await login(request);
    expect(response.status).toBe(200);
    expect(response.cookies.set).toHaveBeenCalled();
  });

  it('returns unauthenticated when no session cookie', async () => {
    const request = new Request('http://localhost', { method: 'GET' });
    const response = await session(request);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
  });

  it('returns authenticated when session cookie is valid', async () => {
    const token = createSessionToken(email);
    const request = new Request('http://localhost', {
      method: 'GET',
      headers: {
        cookie: `${ADMIN_SESSION_COOKIE}=${token}`,
      },
    });
    const response = await session(request);
    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.email).toBe(email);
  });

  it('clears session cookie on logout', async () => {
    const request = new Request('http://localhost', { method: 'POST' });
    const response: any = await logout(request);
    expect(response.status).toBe(200);
    expect(response.cookies.set).toHaveBeenCalled();
  });
});



