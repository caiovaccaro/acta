import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const verdict = await prisma.verdict.findUnique({
      where: { id: params.id },
      include: {
        question: {
          include: {
            topic: true,
          },
        },
        evidenceBullets: {
          include: {
            article: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!verdict) {
      return NextResponse.json(
        { error: 'Verdict not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(verdict);
  } catch (error) {
    console.error('Error fetching verdict:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verdict' },
      { status: 500 }
    );
  }
}
