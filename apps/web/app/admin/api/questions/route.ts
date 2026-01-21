import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId');

    const where = {
      ...(topicId ? { topicId } : {}),
      articleStances: { some: {} },
    };

    const questions = await prisma.question.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { featuredOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        topic: true,
        verdicts: {
          orderBy: { month: 'desc' },
          take: 1,
          select: {
            verdictLabel: true,
            confidence: true,
            month: true,
          },
        },
        _count: {
          select: {
            articleStances: true,
            verdicts: true,
          },
        },
      },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topicId, questionText, contextBlurb, validationStatus, isActive } = body;

    const question = await prisma.question.create({
      data: {
        topicId,
        questionText,
        contextBlurb: contextBlurb || null,
        validationStatus: validationStatus || 'pending',
        isActive: isActive ?? false,
        source: 'seeded',
      },
    });

    return NextResponse.json(question, { status: 201 });
  } catch (error) {
    console.error('Error creating question:', error);
    return NextResponse.json(
      { error: 'Failed to create question' },
      { status: 500 }
    );
  }
}
