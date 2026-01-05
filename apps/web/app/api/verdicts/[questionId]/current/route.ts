import { NextResponse } from 'next/server';
import { getCurrentVerdict } from '@acta/api/services/verdictsService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const verdict = await getCurrentVerdict(params.questionId);
    if (!verdict) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Current verdict not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(verdict);
  } catch (error) {
    console.error('Error fetching current verdict:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch current verdict' } },
      { status: 500 }
    );
  }
}

