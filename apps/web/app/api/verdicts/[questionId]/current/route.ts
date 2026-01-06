import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getCurrentVerdict } from '@acta/api/services/verdictsService';

export async function GET(
  request: Request,
  { params }: { params: { questionId: string } }
) {
  try {
    console.log(`[Verdict API] Fetching current verdict for questionId: ${params.questionId}`);
    console.log(`[Verdict API] DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
    
    const verdict = await getCurrentVerdict(params.questionId);
    if (!verdict) {
      console.warn(`[Verdict API] Current verdict not found for questionId: ${params.questionId}`);
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Current verdict not found' } },
        { status: 404 }
      );
    }
    console.log(`[Verdict API] Successfully fetched current verdict for questionId: ${params.questionId}`);
    return NextResponse.json(verdict);
  } catch (error) {
    console.error('[Verdict API] Error fetching current verdict:', error);
    console.error('[Verdict API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch current verdict', details: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}

