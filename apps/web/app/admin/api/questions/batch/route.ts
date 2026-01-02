import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids, action } = body; // action: 'approve' | 'reject'

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'Invalid action: must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (action === 'approve') {
      updateData.validationStatus = 'validated';
      updateData.isActive = true;
    } else {
      updateData.validationStatus = 'rejected';
      updateData.isActive = false;
    }

    const result = await prisma.question.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
    });
  } catch (error) {
    console.error('Error batch updating questions:', error);
    return NextResponse.json(
      { error: 'Failed to batch update questions' },
      { status: 500 }
    );
  }
}

