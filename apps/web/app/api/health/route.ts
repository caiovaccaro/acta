import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - can be extended to check API connectivity
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'web',
      version: process.env.npm_package_version || '0.0.1',
    };

    return NextResponse.json(health, { status: 200 });
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

