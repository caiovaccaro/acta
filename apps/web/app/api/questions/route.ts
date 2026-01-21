import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAllQuestions } from '@acta/api/services/questionsService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get('featured');
    const featuredOnly = featured === 'true' || featured === '1';
    const questions = await getAllQuestions({ featuredOnly });
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch questions' } },
      { status: 500 }
    );
  }
}

