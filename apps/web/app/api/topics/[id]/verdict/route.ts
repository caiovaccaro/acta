import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getTopicVerdict } from '@acta/api/services/topicsService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const verdict = await getTopicVerdict(params.id);
    if (!verdict) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Verdict not found for this topic' } },
        { status: 404 }
      );
    }
    return NextResponse.json(verdict);
  } catch (error) {
    console.error('Error fetching topic verdict:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch topic verdict' } },
      { status: 500 }
    );
  }
}

