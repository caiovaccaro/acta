import { NextResponse } from 'next/server';
import { loadOperationalHealth, redactHealthError } from '@acta/db';
import { prisma } from '@/lib/prisma';
import { ADMIN_SESSION_COOKIE, verifySessionToken } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function sessionFrom(request: Request): boolean {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`${ADMIN_SESSION_COOKIE}=([^;]+)`));
  return Boolean(verifySessionToken(match?.[1]));
}

export async function GET(request: Request) {
  const authorized = sessionFrom(request);
  if (!authorized) {
    return NextResponse.json(
      { authorized: false, overall: 'unauthorized' },
      { status: 401 },
    );
  }

  try {
    const health = await loadOperationalHealth({ authorized: true, db: prisma });
    return NextResponse.json(health, { status: 200 });
  } catch {
    return NextResponse.json(
      {
        authorized: true,
        overall: 'unknown',
        run: { status: 'unknown' },
        freshness: { status: 'unknown' },
        queues: { status: 'unknown' },
        moderation: { status: 'unknown' },
        budget: { status: 'unknown' },
        error: redactHealthError(),
      },
      { status: 200 },
    );
  }
}
