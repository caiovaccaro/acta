import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Get counts from database
    const [topicsCount, questionsCount, verdictsCount, articlesCount, outletsCount, crawlRequestsCount] = await Promise.all([
      prisma.topic.count(),
      prisma.question.count(),
      prisma.verdict.count(),
      prisma.article.count(),
      prisma.outlet.count(),
      prisma.crawlRequest.count(),
    ]);

    // Get crawl request stats by status
    const crawlStats = await prisma.crawlRequest.groupBy({
      by: ['status'],
      _count: true,
    });

    const crawlStatsByStatus = crawlStats.reduce((acc, stat) => {
      acc[stat.status] = stat._count;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      topics: topicsCount,
      questions: questionsCount,
      verdicts: verdictsCount,
      articles: articlesCount,
      outlets: outletsCount,
      crawlRequests: crawlRequestsCount,
      crawlRequestsByStatus: crawlStatsByStatus,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch stats',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
