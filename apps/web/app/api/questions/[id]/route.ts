import { NextResponse } from 'next/server';
import { getQuestionById } from '@acta/api/services/questionsService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const question = await getQuestionById(params.id);
    if (!question) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Question not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch question' } },
      { status: 500 }
    );
  }
}

