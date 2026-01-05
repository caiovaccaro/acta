import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAllQuestions } from '@acta/api/services/questionsService';

export async function GET() {
  try {
    const questions = await getAllQuestions();
    return NextResponse.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch questions' } },
      { status: 500 }
    );
  }
}

