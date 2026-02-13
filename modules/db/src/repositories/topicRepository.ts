/**
 * Topic Repository
 * Handles Topic model operations
 */

import { prisma } from '../index';
import type { Topic, ModerationStatus, TopicSource } from '@prisma/client';

export interface CreateTopicInput {
  name: string;
  description?: string | null;
  safetyNoteRequired?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number | null;
  source?: TopicSource;
  moderationStatus?: ModerationStatus;
  discoveredAt?: Date | null;
  discoveredFromArticles?: Record<string, unknown> | null;
}

export interface UpdateTopicInput {
  name?: string;
  description?: string | null;
  safetyNoteRequired?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number | null;
  source?: TopicSource;
  moderationStatus?: ModerationStatus;
  discoveredAt?: Date | null;
  discoveredFromArticles?: Record<string, unknown> | null;
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
  includePending: boolean = false,
  featuredOnly: boolean = false
): Promise<Topic[]> {
  return prisma.topic.findMany({
    where: {
      ...(includePending ? {} : { moderationStatus: 'approved' }),
      ...(featuredOnly ? { isFeatured: true } : {}),
    },
    orderBy: featuredOnly
      ? [{ featuredOrder: 'asc' }, { name: 'asc' }]
      : { name: 'asc' },
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
      isFeatured: input.isFeatured ?? false,
      featuredOrder: input.featuredOrder ?? null,
      source: input.source ?? 'seeded',
      moderationStatus: input.moderationStatus ?? 'approved',
      discoveredAt: input.discoveredAt ?? null,
      discoveredFromArticles: (input.discoveredFromArticles ?? null) as any,
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

export interface ConvergeTopicsInput {
  targetTopicId: string;  // Topic to keep
  sourceTopicIds: string[];  // Topics to merge into target
  newName?: string;  // Optional: rename target topic
  newDescription?: string;  // Optional: update description
}

export interface ConvergeTopicsResult {
  targetTopic: Topic;
  migratedQuestions: number;
  migratedTopicArticles: number;
  migratedTimelineEvents: number;
  deletedTopics: number;
}

/**
 * Converges multiple topics into a single target topic.
 * Migrates all questions, topic articles, and timeline events from source topics to target.
 * Handles duplicates and preserves earliest dates.
 * 
 * @param input - Convergence input data
 * @returns Convergence result with migration counts
 * @throws Error if validation fails or transaction fails
 */
export async function convergeTopics(
  input: ConvergeTopicsInput
): Promise<ConvergeTopicsResult> {
  const { targetTopicId, sourceTopicIds, newName, newDescription } = input;

  // Validation
  if (!targetTopicId || !sourceTopicIds || sourceTopicIds.length === 0) {
    throw new Error('targetTopicId and at least one sourceTopicId are required');
  }

  if (sourceTopicIds.includes(targetTopicId)) {
    throw new Error('targetTopicId cannot be in sourceTopicIds');
  }

  // Remove duplicates from sourceTopicIds
  const uniqueSourceIds = Array.from(new Set(sourceTopicIds));
  if (uniqueSourceIds.length !== sourceTopicIds.length) {
    console.warn('Duplicate source topic IDs removed');
  }

  // Validate all topics exist
  const targetTopic = await findTopicById(targetTopicId);
  if (!targetTopic) {
    throw new Error(`Target topic not found: ${targetTopicId}`);
  }

  const sourceTopics = await prisma.topic.findMany({
    where: { id: { in: uniqueSourceIds } },
    include: {
      questions: true,
      topicArticles: true,
      timelineEvents: true,
    },
  });

  if (sourceTopics.length !== uniqueSourceIds.length) {
    const foundIds = sourceTopics.map(t => t.id);
    const missingIds = uniqueSourceIds.filter(id => !foundIds.includes(id));
    throw new Error(`Source topics not found: ${missingIds.join(', ')}`);
  }

  // Check for name conflict if renaming
  if (newName && newName !== targetTopic.name) {
    const existingTopic = await findTopicByName(newName);
    if (existingTopic && existingTopic.id !== targetTopicId) {
      throw new Error(`Topic with name "${newName}" already exists`);
    }
  }

  // Execute convergence in a transaction
  return await prisma.$transaction(async (tx) => {
    let migratedQuestions = 0;
    let migratedTopicArticles = 0;
    let migratedTimelineEvents = 0;

    // 1. Migrate Questions
    for (const sourceTopic of sourceTopics) {
      if (sourceTopic.questions.length > 0) {
        const result = await tx.question.updateMany({
          where: { topicId: sourceTopic.id },
          data: { topicId: targetTopicId },
        });
        migratedQuestions += result.count;
      }
    }

    // 2. Migrate TopicArticles (handle duplicates)
    for (const sourceTopic of sourceTopics) {
      for (const topicArticle of sourceTopic.topicArticles) {
        // Check if article is already linked to target topic
        const existingLink = await tx.topicArticle.findFirst({
          where: {
            topicId: targetTopicId,
            articleId: topicArticle.articleId,
          },
        });

        if (existingLink) {
          // Keep the one with earliest assignedAt
          if (topicArticle.assignedAt < existingLink.assignedAt) {
            await tx.topicArticle.update({
              where: { id: existingLink.id },
              data: { assignedAt: topicArticle.assignedAt },
            });
          }
          // Delete the duplicate
          await tx.topicArticle.delete({
            where: { id: topicArticle.id },
          });
        } else {
          // Migrate to target topic
          await tx.topicArticle.update({
            where: { id: topicArticle.id },
            data: { topicId: targetTopicId },
          });
          migratedTopicArticles++;
        }
      }
    }

    // 3. Migrate TimelineEvents
    for (const sourceTopic of sourceTopics) {
      if (sourceTopic.timelineEvents.length > 0) {
        const result = await tx.timelineEvent.updateMany({
          where: { topicId: sourceTopic.id },
          data: { topicId: targetTopicId },
        });
        migratedTimelineEvents += result.count;
      }
    }

    // 4. Build audit trail
    const convergenceHistory = {
      convergedAt: new Date().toISOString(),
      sourceTopics: sourceTopics.map(t => ({
        id: t.id,
        name: t.name,
      })),
    };

    // Merge discoveredFromArticles if both have data
    let mergedDiscoveredFromArticles = targetTopic.discoveredFromArticles;
    if (sourceTopics.some(t => t.discoveredFromArticles)) {
      const sourceDiscovered = sourceTopics
        .filter(t => t.discoveredFromArticles)
        .map(t => t.discoveredFromArticles);
      
      if (Array.isArray(mergedDiscoveredFromArticles)) {
        mergedDiscoveredFromArticles = [
          ...(mergedDiscoveredFromArticles as any[]),
          ...sourceDiscovered,
        ];
      } else {
        mergedDiscoveredFromArticles = sourceDiscovered;
      }
    }

    // 5. Update target topic metadata
    const updateData: any = {
      name: newName || targetTopic.name,
      description: newDescription !== undefined ? newDescription : targetTopic.description,
      safetyNoteRequired: sourceTopics.some(t => t.safetyNoteRequired) || targetTopic.safetyNoteRequired,
      discoveredFromArticles: mergedDiscoveredFromArticles as any,
    };

    // Store convergence history in discoveredFromArticles (or add separate field if schema updated)
    // For now, we'll merge it into discoveredFromArticles
    if (targetTopic.discoveredFromArticles) {
      const currentHistory = Array.isArray(targetTopic.discoveredFromArticles)
        ? targetTopic.discoveredFromArticles
        : [targetTopic.discoveredFromArticles];
      updateData.discoveredFromArticles = [
        ...currentHistory,
        { type: 'convergence', ...convergenceHistory },
      ] as any;
    } else {
      updateData.discoveredFromArticles = [
        { type: 'convergence', ...convergenceHistory },
      ] as any;
    }

    const updatedTargetTopic = await tx.topic.update({
      where: { id: targetTopicId },
      data: updateData as any,
    });

    // 6. Delete source topics
    const deleteResult = await tx.topic.deleteMany({
      where: { id: { in: uniqueSourceIds } },
    });

    return {
      targetTopic: updatedTargetTopic,
      migratedQuestions,
      migratedTopicArticles,
      migratedTimelineEvents,
      deletedTopics: deleteResult.count,
    };
  });
}

