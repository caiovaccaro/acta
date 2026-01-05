import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getVerdictHistory } from '@acta/api/services/verdictsService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 12;
    
    const verdicts = await getVerdictHistory(params.questionId, limit);
    return NextResponse.json(verdicts);
  } catch (error) {
    console.error('Error fetching verdict history:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch verdict history' } },
      { status: 500 }
    );
  }
}

