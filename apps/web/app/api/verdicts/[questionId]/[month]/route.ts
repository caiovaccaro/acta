import { NextResponse } from 'next/server';
import { getVerdictCard } from '@acta/api/services/verdictsService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string; month: string } }
) {
  try {
    const verdict = await getVerdictCard(params.questionId, params.month);
    if (!verdict) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Verdict not found for this month' } },
        { status: 404 }
      );
    }
    return NextResponse.json(verdict);
  } catch (error) {
    console.error('Error fetching verdict:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch verdict' } },
      { status: 500 }
    );
  }
}

