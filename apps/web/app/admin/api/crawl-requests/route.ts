import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status ? { status: status as any } : {};

    const crawlRequests = await prisma.crawlRequest.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        outlet: true,
        article: true,
      },
    });

    const total = await prisma.crawlRequest.count({ where });

    return NextResponse.json({
      crawlRequests,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching crawl requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch crawl requests' },
      { status: 500 }
    );
  }
}

