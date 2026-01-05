import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const topics = await prisma.topic.findMany({
      orderBy: { name: 'asc' },
      include: {
        questions: {
          where: { isActive: true },
        },
        _count: {
          select: {
            questions: true,
            topicArticles: true,
          },
        },
      },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, safetyNoteRequired, moderationStatus } = body;

    const topic = await prisma.topic.create({
      data: {
        name,
        description: description || null,
        safetyNoteRequired: safetyNoteRequired ?? false,
        moderationStatus: moderationStatus || 'approved',
        source: 'seeded',
      },
    });

    return NextResponse.json(topic, { status: 201 });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}
