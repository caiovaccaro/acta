import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionTokenEdge } from '@/lib/adminAuthEdge';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) {
    return NextResponse.next();
  }

  // Allow login page and auth endpoints
  if (pathname === '/admin/login' || pathname.startsWith('/admin/api/auth')) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionTokenEdge(token);

  if (session) {
    return NextResponse.next();
  }

  // Block admin API when unauthenticated
  if (pathname.startsWith('/admin/api')) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  // Redirect to login page for UI routes
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/admin/login';
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/admin/:path*'],
};



