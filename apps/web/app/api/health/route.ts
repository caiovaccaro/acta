import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@acta/db';

export async function GET() {
  try {
    // Check database connection
    let dbStatus = 'unknown';
    let dbError = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
      dbError = error instanceof Error ? error.message : String(error);
    }

    const health = {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'web',
      version: process.env.npm_package_version || '0.0.1',
      database: {
        status: dbStatus,
        urlPresent: !!process.env.DATABASE_URL,
        error: dbError,
      },
    };

    return NextResponse.json(health, { status: dbStatus === 'connected' ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        service: 'web',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

