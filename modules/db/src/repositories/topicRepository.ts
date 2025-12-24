/**
 * Topic Repository
 * Handles Topic model operations
 */

import { prisma } from '../index.js';
import type { Topic, ModerationStatus, TopicSource } from '@prisma/client';

export interface CreateTopicInput {
  name: string;
  description?: string | null;
  safetyNoteRequired?: boolean;
  source?: TopicSource;
  moderationStatus?: ModerationStatus;
  discoveredAt?: Date | null;
  discoveredFromArticles?: Record<string, unknown> | null;
  mainQuestionId?: string | null;
}

export interface UpdateTopicInput {
  name?: string;
  description?: string | null;
  safetyNoteRequired?: boolean;
  source?: TopicSource;
  moderationStatus?: ModerationStatus;
  discoveredAt?: Date | null;
  discoveredFromArticles?: Record<string, unknown> | null;
  mainQuestionId?: string | null;
}

/**
 * Finds a topic by ID
 * @param id - Topic ID
 * @returns Topic or null if not found
 */
export async function findTopicById(id: string): Promise<Topic | null> {
  return prisma.topic.findUnique({
    where: { id },
    include: {
      questions: true,
      topicArticles: true,
    },
  });
}

/**
 * Finds a topic by name (case-insensitive)
 * @param name - Topic name
 * @returns Topic or null if not found
 */
export async function findTopicByName(name: string): Promise<Topic | null> {
  return prisma.topic.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    include: {
      questions: true,
      topicArticles: true,
    },
  });
}

/**
 * Finds all topics
 * @returns Array of Topics
 */
export async function findAllTopics(
  includePending: boolean = false
): Promise<Topic[]> {
  return prisma.topic.findMany({
    where: includePending
      ? {}
      : {
          moderationStatus: 'approved',
        },
    orderBy: { name: 'asc' },
    include: {
      questions: {
        where: { isActive: true },
      },
      topicArticles: true,
    },
  });
}

/**
 * Creates a new topic
 * @param input - Topic input data
 * @returns Created Topic
 */
export async function createTopic(input: CreateTopicInput): Promise<Topic> {
  return prisma.topic.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      safetyNoteRequired: input.safetyNoteRequired ?? false,
      source: input.source ?? 'seeded',
      moderationStatus: input.moderationStatus ?? 'approved',
      discoveredAt: input.discoveredAt ?? null,
      discoveredFromArticles: (input.discoveredFromArticles ?? null) as any,
      mainQuestionId: input.mainQuestionId ?? null,
    },
  });
}

/**
 * Updates an existing topic
 * @param id - Topic ID
 * @param input - Update data
 * @returns Updated Topic
 */
export async function updateTopic(
  id: string,
  input: UpdateTopicInput
): Promise<Topic> {
  return prisma.topic.update({
    where: { id },
    data: {
      ...input,
      description: input.description ?? undefined,
      discoveredAt: input.discoveredAt ?? undefined,
      discoveredFromArticles: (input.discoveredFromArticles ?? undefined) as any,
      mainQuestionId: input.mainQuestionId ?? undefined,
    },
  });
}

/**
 * Deletes a topic
 * @param id - Topic ID
 * @returns Deleted Topic
 */
export async function deleteTopic(id: string): Promise<Topic> {
  return prisma.topic.delete({
    where: { id },
  });
}

/**
 * Finds or creates a topic by name
 * @param input - Topic input data
 * @returns Existing or newly created Topic
 */
export async function findOrCreateTopic(
  input: CreateTopicInput
): Promise<Topic> {
  const existing = await findTopicByName(input.name);
  
  if (existing) {
    return existing;
  }
  
  return createTopic(input);
}

export async function findTopicsByModerationStatus(
  status: ModerationStatus
): Promise<Topic[]> {
  return prisma.topic.findMany({
    where: { moderationStatus: status },
    orderBy: { createdAt: 'desc' },
  });
}

export async function approveTopic(id: string): Promise<Topic> {
  return prisma.topic.update({
    where: { id },
    data: { moderationStatus: 'approved' },
  });
}

export async function rejectTopic(id: string): Promise<Topic> {
  return prisma.topic.update({
    where: { id },
    data: { moderationStatus: 'rejected' },
  });
}

