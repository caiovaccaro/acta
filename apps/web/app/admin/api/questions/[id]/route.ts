import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        topic: true,
        _count: {
          select: {
            articleStances: true,
            verdicts: true,
          },
        },
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: 'Failed to fetch question' },
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
    const {
      questionText,
      contextBlurb,
      validationStatus,
      isActive,
      suggestions,
      isFeatured,
      featuredOrder,
    } = body;

    const question = await prisma.question.update({
      where: { id: params.id },
      data: {
        questionText,
        contextBlurb: contextBlurb || null,
        validationStatus: validationStatus || 'pending',
        isActive: isActive ?? false,
        suggestions: suggestions || [],
        isFeatured: isFeatured ?? undefined,
        featuredOrder: featuredOrder ?? undefined,
      },
    });

    return NextResponse.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    return NextResponse.json(
      { error: 'Failed to update question' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.question.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting question:', error);
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    );
  }
}

