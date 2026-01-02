import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const verdicts = await prisma.verdict.findMany({
      orderBy: { month: 'desc' },
      include: {
        question: {
          include: {
            topic: true,
            articleStances: {
              include: {
                article: {
                  include: {
                    outlet: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Calculate article and outlet counts for each verdict
    const verdictsWithCounts = verdicts.map(verdict => {
      const articleIds = new Set(
        verdict.question.articleStances.map(as => as.article.id)
      );
      const outletIds = new Set(
        verdict.question.articleStances.map(as => as.article.outlet.id)
      );

      return {
        ...verdict,
        _count: {
          articles: articleIds.size,
          outlets: outletIds.size,
        },
      };
    });

    return NextResponse.json(verdictsWithCounts);
  } catch (error) {
    console.error('Error fetching verdicts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verdicts' },
      { status: 500 }
    );
  }
}

