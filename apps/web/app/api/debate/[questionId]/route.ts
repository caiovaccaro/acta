import { NextResponse } from 'next/server';
import { getDebateCard } from '@acta/api/services/debateService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;
    
    const debateCard = await getDebateCard(params.questionId, month);
    if (!debateCard) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Debate card not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(debateCard);
  } catch (error) {
    console.error('Error fetching debate card:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch debate card' } },
      { status: 500 }
    );
  }
}

