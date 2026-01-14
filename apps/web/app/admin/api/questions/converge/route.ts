import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { convergeQuestions, type ConvergeQuestionsInput } from '@acta/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetQuestionId, sourceQuestionIds, newQuestionText, newContextBlurb } = body;

    // Validation
    if (!targetQuestionId || typeof targetQuestionId !== 'string') {
      return NextResponse.json(
        { error: 'targetQuestionId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sourceQuestionIds || !Array.isArray(sourceQuestionIds) || sourceQuestionIds.length === 0) {
      return NextResponse.json(
        { error: 'sourceQuestionIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate all IDs are strings
    if (!sourceQuestionIds.every(id => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'All sourceQuestionIds must be strings' },
        { status: 400 }
      );
    }

    // Check for duplicates in sourceQuestionIds
    const uniqueSourceIds = Array.from(new Set(sourceQuestionIds));
    if (uniqueSourceIds.length !== sourceQuestionIds.length) {
      return NextResponse.json(
        { error: 'sourceQuestionIds contains duplicates' },
        { status: 400 }
      );
    }

    // Check that target is not in source
    if (sourceQuestionIds.includes(targetQuestionId)) {
      return NextResponse.json(
        { error: 'targetQuestionId cannot be in sourceQuestionIds' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (newQuestionText !== undefined && (typeof newQuestionText !== 'string' || newQuestionText.trim().length === 0)) {
      return NextResponse.json(
        { error: 'newQuestionText must be a non-empty string if provided' },
        { status: 400 }
      );
    }

    if (newContextBlurb !== undefined && typeof newContextBlurb !== 'string') {
      return NextResponse.json(
        { error: 'newContextBlurb must be a string if provided' },
        { status: 400 }
      );
    }

    // Prepare input
    const input: ConvergeQuestionsInput = {
      targetQuestionId,
      sourceQuestionIds: uniqueSourceIds,
      ...(newQuestionText && { newQuestionText: newQuestionText.trim() }),
      ...(newContextBlurb !== undefined && { newContextBlurb: newContextBlurb.trim() || null }),
    };

    // Execute convergence
    const result = await convergeQuestions(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error converging questions:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });

    // Handle known errors
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    // Removed topic mismatch error - questions can now be from different topics

    if (error.message?.includes('required') || error.message?.includes('cannot be')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle Prisma foreign key constraint errors
    if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { 
          error: 'Failed to converge questions due to data integrity constraint',
          details: error.message 
        },
        { status: 409 }
      );
    }

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { 
          error: 'Failed to converge questions due to duplicate data',
          details: error.message 
        },
        { status: 409 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        error: 'Failed to converge questions', 
        details: error.message,
        code: error.code || 'UNKNOWN_ERROR'
      },
      { status: 500 }
    );
  }
}

