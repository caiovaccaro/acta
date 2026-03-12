import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getQuestionCountryStances } from '@acta/api/services/consensusService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || undefined;

    const countries = await getQuestionCountryStances(params.id, month);
    return NextResponse.json(countries ?? []);
  } catch (error) {
    console.error('Error fetching country stances:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch country stances' } },
      { status: 500 }
    );
  }
}

