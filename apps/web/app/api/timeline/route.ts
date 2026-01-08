import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getTimelineEvents, generateTimelineEvents } from '@acta/api/services/timelineService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topicId = searchParams.get('topicId') || undefined;
    const questionId = searchParams.get('questionId') || undefined;
    const generate = searchParams.get('generate') === 'true';

    // Try to get stored events first
    let events = await getTimelineEvents(topicId, questionId);
    
    // If no events found and generate=true, generate on-demand (fallback)
    if (events.length === 0 && generate) {
      events = await generateTimelineEvents(topicId, questionId);
    }
    
    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch timeline' } },
      { status: 500 }
    );
  }
}

