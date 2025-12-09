/**
 * TopicArticle Repository
 * Handles TopicArticle (join table) operations
 */

import { prisma } from '../index.js';
import type { TopicArticle } from '@prisma/client';

export interface CreateTopicArticleInput {
  topicId: string;
  articleId: string;
  confidence?: number | null;
}

/**
 * Finds a topic-article relationship by ID
 * @param id - TopicArticle ID
 * @returns TopicArticle or null if not found
 */
export async function findTopicArticleById(
  id: string
): Promise<TopicArticle | null> {
  return prisma.topicArticle.findUnique({
    where: { id },
    include: {
      topic: true,
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Finds topic-article relationships by topic ID
 * @param topicId - Topic ID
 * @returns Array of TopicArticles
 */
export async function findTopicArticlesByTopicId(
  topicId: string
): Promise<TopicArticle[]> {
  return prisma.topicArticle.findMany({
    where: { topicId },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
}

/**
 * Finds topic-article relationships by article ID
 * @param articleId - Article ID
 * @returns Array of TopicArticles
 */
export async function findTopicArticlesByArticleId(
  articleId: string
): Promise<TopicArticle[]> {
  return prisma.topicArticle.findMany({
    where: { articleId },
    include: {
      topic: true,
    },
    orderBy: { assignedAt: 'desc' },
  });
}

/**
 * Finds a topic-article relationship by topic and article IDs
 * @param topicId - Topic ID
 * @param articleId - Article ID
 * @returns TopicArticle or null if not found
 */
export async function findTopicArticleByTopicAndArticle(
  topicId: string,
  articleId: string
): Promise<TopicArticle | null> {
  return prisma.topicArticle.findUnique({
    where: {
      topicId_articleId: {
        topicId,
        articleId,
      },
    },
    include: {
      topic: true,
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Creates a new topic-article relationship
 * @param input - TopicArticle input data
 * @returns Created TopicArticle
 */
export async function createTopicArticle(
  input: CreateTopicArticleInput
): Promise<TopicArticle> {
  return prisma.topicArticle.create({
    data: {
      topicId: input.topicId,
      articleId: input.articleId,
      confidence: input.confidence ?? null,
    },
    include: {
      topic: true,
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Creates or updates a topic-article relationship (upsert)
 * @param input - TopicArticle input data
 * @returns Created or updated TopicArticle
 */
export async function createOrUpdateTopicArticle(
  input: CreateTopicArticleInput
): Promise<TopicArticle> {
  return prisma.topicArticle.upsert({
    where: {
      topicId_articleId: {
        topicId: input.topicId,
        articleId: input.articleId,
      },
    },
    create: {
      topicId: input.topicId,
      articleId: input.articleId,
      confidence: input.confidence ?? null,
    },
    update: {
      confidence: input.confidence ?? undefined,
    },
    include: {
      topic: true,
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Deletes a topic-article relationship
 * @param id - TopicArticle ID
 * @returns Deleted TopicArticle
 */
export async function deleteTopicArticle(id: string): Promise<TopicArticle> {
  return prisma.topicArticle.delete({
    where: { id },
  });
}

/**
 * Deletes a topic-article relationship by topic and article IDs
 * @param topicId - Topic ID
 * @param articleId - Article ID
 * @returns Deleted TopicArticle
 */
export async function deleteTopicArticleByTopicAndArticle(
  topicId: string,
  articleId: string
): Promise<TopicArticle> {
  return prisma.topicArticle.delete({
    where: {
      topicId_articleId: {
        topicId,
        articleId,
      },
    },
  });
}

/**
 * Counts articles assigned to a topic
 * @param topicId - Topic ID
 * @returns Count
 */
export async function countArticlesByTopic(topicId: string): Promise<number> {
  return prisma.topicArticle.count({
    where: { topicId },
  });
}

