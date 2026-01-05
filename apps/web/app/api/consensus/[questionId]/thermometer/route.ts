import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getConsensusThermometer } from '@acta/api/services/consensusService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;
    
    const thermometer = await getConsensusThermometer(params.questionId, month);
    if (!thermometer) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Consensus data not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(thermometer);
  } catch (error) {
    console.error('Error fetching consensus thermometer:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch consensus data' } },
      { status: 500 }
    );
  }
}

