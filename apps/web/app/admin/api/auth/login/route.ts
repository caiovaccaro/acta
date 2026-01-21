import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, createSessionToken, getAdminCredentials, getSessionCookieOptions } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const admin = getAdminCredentials();
    if (email !== admin.email || password !== admin.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = createSessionToken(email);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, token, getSessionCookieOptions());
    return response;
  } catch (error) {
    console.error('Admin login failed:', error);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}



