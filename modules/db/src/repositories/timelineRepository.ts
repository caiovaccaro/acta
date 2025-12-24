import { prisma } from '../index.js';
import type { TimelineEvent } from '@prisma/client';

export interface CreateTimelineEventInput {
  topicId?: string | null;
  questionId?: string | null;
  date: Date;
  title: string;
  description: string;
  order?: number;
}

export async function findTimelineEventsByTopicOrQuestion(
  topicId?: string,
  questionId?: string
): Promise<TimelineEvent[]> {
  return prisma.timelineEvent.findMany({
    where: {
      ...(topicId ? { topicId } : {}),
      ...(questionId ? { questionId } : {}),
    },
    orderBy: [{ date: 'asc' }, { order: 'asc' }],
  });
}

export async function createTimelineEvents(
  events: CreateTimelineEventInput[]
): Promise<TimelineEvent[]> {
  if (!events.length) return [];
  return prisma.$transaction(
    events.map((ev) =>
      prisma.timelineEvent.create({
        data: {
          topicId: ev.topicId ?? null,
          questionId: ev.questionId ?? null,
          date: ev.date,
          title: ev.title,
          description: ev.description,
          order: ev.order ?? 0,
        },
      })
    )
  );
}


