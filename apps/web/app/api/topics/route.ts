import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAllTopics } from '@acta/api/services/topicsService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const featuredOnly = ['true', '1'].includes((searchParams.get('featured') || '').toLowerCase());
    
    const topics = await getAllTopics(includeInactive, featuredOnly);
    return NextResponse.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to fetch topics',
          details: errorMessage,
          ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
        } 
      },
      { status: 500 }
    );
  }
}

