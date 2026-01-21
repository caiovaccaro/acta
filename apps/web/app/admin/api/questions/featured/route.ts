import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, isFeatured } = body as { id?: string; isFeatured?: boolean };

    if (!id || typeof isFeatured !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing id or isFeatured flag' },
        { status: 400 }
      );
    }

    const question = await prisma.question.findUnique({
      where: { id },
      select: { id: true, topicId: true, featuredOrder: true },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    if (isFeatured) {
      const maxOrder = await prisma.question.aggregate({
        where: { isFeatured: true },
        _max: { featuredOrder: true },
      });
      const nextOrder = (maxOrder._max.featuredOrder ?? -1) + 1;

      await prisma.$transaction([
        prisma.question.updateMany({
          where: {
            topicId: question.topicId,
            isFeatured: true,
            NOT: { id },
          },
          data: { isFeatured: false },
        }),
        prisma.question.update({
          where: { id },
          data: {
            isFeatured: true,
            featuredOrder: question.featuredOrder ?? nextOrder,
          },
        }),
      ]);
    } else {
      await prisma.question.update({
        where: { id },
        data: { isFeatured: false },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating featured question:', error);
    return NextResponse.json(
      { error: 'Failed to update featured question' },
      { status: 500 }
    );
  }
}



