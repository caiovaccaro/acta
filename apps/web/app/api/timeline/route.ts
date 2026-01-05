import { NextResponse } from 'next/server';
import { getTimelineEvents, generateTimelineEvents } from '@acta/api/services/timelineService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId') || undefined;
    const questionId = searchParams.get('questionId') || undefined;
    const generate = searchParams.get('generate') === 'true';

    if (generate) {
      const events = await generateTimelineEvents(topicId, questionId);
      return NextResponse.json(events);
    }

    const events = await getTimelineEvents(topicId, questionId);
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline' } },
      { status: 500 }
    );
  }
}

