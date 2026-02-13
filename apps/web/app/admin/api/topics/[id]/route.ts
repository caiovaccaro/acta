import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const topic = await prisma.topic.findUnique({
      where: { id: params.id },
      include: {
        questions: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            questions: true,
            topicArticles: true,
          },
        },
      },
    });

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Error fetching topic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topic' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, safetyNoteRequired, moderationStatus, isFeatured, featuredOrder } = body;

    const topic = await prisma.topic.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
        safetyNoteRequired: safetyNoteRequired ?? false,
        isFeatured: isFeatured ?? undefined,
        featuredOrder: featuredOrder ?? undefined,
        moderationStatus: moderationStatus || 'approved',
      },
    });

    return NextResponse.json(topic);
  } catch (error) {
    console.error('Error updating topic:', error);
    return NextResponse.json(
      { error: 'Failed to update topic' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.topic.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting topic:', error);
    return NextResponse.json(
      { error: 'Failed to delete topic' },
      { status: 500 }
    );
  }
}



