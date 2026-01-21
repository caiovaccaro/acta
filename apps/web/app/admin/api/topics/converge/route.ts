import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { convergeTopics, type ConvergeTopicsInput } from '@acta/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { targetTopicId, sourceTopicIds, newName, newDescription } = body;

    // Validation
    if (!targetTopicId || typeof targetTopicId !== 'string') {
      return NextResponse.json(
        { error: 'targetTopicId is required and must be a string' },
        { status: 400 }
      );
    }

    if (!sourceTopicIds || !Array.isArray(sourceTopicIds) || sourceTopicIds.length === 0) {
      return NextResponse.json(
        { error: 'sourceTopicIds is required and must be a non-empty array' },
        { status: 400 }
      );
    }

    // Validate all IDs are strings
    if (!sourceTopicIds.every(id => typeof id === 'string')) {
      return NextResponse.json(
        { error: 'All sourceTopicIds must be strings' },
        { status: 400 }
      );
    }

    // Check for duplicates in sourceTopicIds
    const uniqueSourceIds = Array.from(new Set(sourceTopicIds));
    if (uniqueSourceIds.length !== sourceTopicIds.length) {
      return NextResponse.json(
        { error: 'sourceTopicIds contains duplicates' },
        { status: 400 }
      );
    }

    // Check that target is not in source
    if (sourceTopicIds.includes(targetTopicId)) {
      return NextResponse.json(
        { error: 'targetTopicId cannot be in sourceTopicIds' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (newName !== undefined && (typeof newName !== 'string' || newName.trim().length === 0)) {
      return NextResponse.json(
        { error: 'newName must be a non-empty string if provided' },
        { status: 400 }
      );
    }

    if (newDescription !== undefined && typeof newDescription !== 'string') {
      return NextResponse.json(
        { error: 'newDescription must be a string if provided' },
        { status: 400 }
      );
    }

    // Prepare input
    const input: ConvergeTopicsInput = {
      targetTopicId,
      sourceTopicIds: uniqueSourceIds,
      ...(newName && { newName: newName.trim() }),
      ...(newDescription !== undefined && { newDescription: newDescription.trim() || null }),
    };

    // Execute convergence
    const result = await convergeTopics(input);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error converging topics:', error);

    // Handle known errors
    if (error.message?.includes('not found')) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }

    if (error.message?.includes('already exists')) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      );
    }

    if (error.message?.includes('required') || error.message?.includes('cannot be')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      { error: 'Failed to converge topics', details: error.message },
      { status: 500 }
    );
  }
}



