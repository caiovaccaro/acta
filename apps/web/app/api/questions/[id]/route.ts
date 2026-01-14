import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getQuestionById } from '@acta/api/services/questionsService';
import { findQuestionRedirect } from '@acta/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check for redirect first
    const redirect = await findQuestionRedirect(params.id);
    if (redirect) {
      // Return 301 permanent redirect
      const url = new URL(request.url);
      const newUrl = new URL(`/api/questions/${redirect.newQuestionId}`, url.origin);
      // Preserve query parameters
      url.searchParams.forEach((value, key) => {
        newUrl.searchParams.set(key, value);
      });
      return NextResponse.redirect(newUrl, { status: 301 });
    }

    // No redirect, fetch question normally
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

