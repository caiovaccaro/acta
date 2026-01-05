import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getTopicById } from '@acta/api/services/topicsService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const topic = await getTopicById(params.id);
    if (!topic) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Topic not found' } },
        { status: 404 }
      );
    }
    return NextResponse.json(topic);
  } catch (error) {
    console.error('Error fetching topic:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch topic' } },
      { status: 500 }
    );
  }
}

