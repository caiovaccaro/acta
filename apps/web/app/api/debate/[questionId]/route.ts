import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getDebateCard } from '@acta/api/services/debateService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;
    
    console.log(`[Debate API] Fetching debate card for questionId: ${params.questionId}, month: ${month || 'current'}`);
    console.log(`[Debate API] DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
    
    const debateCard = await getDebateCard(params.questionId, month);
    if (!debateCard) {
      console.warn(`[Debate API] Debate card not found for questionId: ${params.questionId}`);
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Debate card not found' } },
        { status: 404 }
      );
    }
    console.log(`[Debate API] Successfully fetched debate card for questionId: ${params.questionId}`);
    return NextResponse.json(debateCard);
  } catch (error) {
    console.error('[Debate API] Error fetching debate card:', error);
    console.error('[Debate API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch debate card', details: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}

