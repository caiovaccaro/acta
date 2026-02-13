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

    const topic = await prisma.topic.findUnique({
      where: { id },
      select: { id: true, featuredOrder: true },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    if (isFeatured) {
      const maxOrder = await prisma.topic.aggregate({
        where: { isFeatured: true },
        _max: { featuredOrder: true },
      });
      const nextOrder = (maxOrder._max.featuredOrder ?? -1) + 1;

      await prisma.topic.update({
        where: { id },
        data: {
          isFeatured: true,
          featuredOrder: topic.featuredOrder ?? nextOrder,
        },
      });
    } else {
      await prisma.topic.update({
        where: { id },
        data: { isFeatured: false, featuredOrder: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating featured topic:', error);
    return NextResponse.json(
      { error: 'Failed to update featured topic' },
      { status: 500 }
    );
  }
}
