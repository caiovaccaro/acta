import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const outletId = searchParams.get('outletId');
    const topicId = searchParams.get('topicId');

    const where: any = {};
    if (outletId) {
      where.outletId = outletId;
    }
    if (topicId) {
      where.topicArticles = {
        some: {
          topicId,
        },
      };
    }

    const articles = await prisma.article.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { extractedAt: 'desc' },
      include: {
        outlet: true,
        topicArticles: {
          include: {
            topic: true,
          },
        },
      },
    });

    const total = await prisma.article.count({ where });

    return NextResponse.json({
      articles,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

