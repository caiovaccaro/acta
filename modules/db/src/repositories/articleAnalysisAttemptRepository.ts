/**
 * ArticleAnalysisAttempt Repository
 * Handles ArticleAnalysisAttempt model operations
 */

import { prisma } from '../index.js';
import type { ArticleAnalysisAttempt, Stance } from '@prisma/client';

export interface CreateArticleAnalysisAttemptInput {
  articleId: string;
  questionId: string;
  month: Date; // Should be first day of month (YYYY-MM-01)
  stance: Stance;
  confidence: number; // 0-1
  reasoning?: string | null;
}

export interface UpdateArticleAnalysisAttemptInput {
  stance?: Stance;
  confidence?: number;
  reasoning?: string | null;
}

/**
 * Finds an article analysis attempt by ID
 * @param id - ArticleAnalysisAttempt ID
 * @returns ArticleAnalysisAttempt or null if not found
 */
export async function findArticleAnalysisAttemptById(
  id: string
): Promise<ArticleAnalysisAttempt | null> {
  return prisma.articleAnalysisAttempt.findUnique({
    where: { id },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Finds article analysis attempts by article ID
 * @param articleId - Article ID
 * @returns Array of ArticleAnalysisAttempts
 */
export async function findArticleAnalysisAttemptsByArticleId(
  articleId: string
): Promise<ArticleAnalysisAttempt[]> {
  return prisma.articleAnalysisAttempt.findMany({
    where: { articleId },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
    orderBy: { analyzedAt: 'desc' },
  });
}

/**
 * Finds article analysis attempts by question ID
 * @param questionId - Question ID
 * @param month - Optional month filter (first day of month)
 * @returns Array of ArticleAnalysisAttempts
 */
export async function findArticleAnalysisAttemptsByQuestionId(
  questionId: string,
  month?: Date
): Promise<ArticleAnalysisAttempt[]> {
  return prisma.articleAnalysisAttempt.findMany({
    where: {
      questionId,
      ...(month ? { month } : {}),
    },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
    },
    orderBy: { analyzedAt: 'desc' },
  });
}

/**
 * Finds article analysis attempt by article, question, and month (unique triad)
 * @param articleId - Article ID
 * @param questionId - Question ID
 * @param month - Month period (first day of month)
 * @returns ArticleAnalysisAttempt or null if not found
 */
export async function findArticleAnalysisAttemptByTriad(
  articleId: string,
  questionId: string,
  month: Date
): Promise<ArticleAnalysisAttempt | null> {
  return prisma.articleAnalysisAttempt.findUnique({
    where: {
      articleId_questionId_month: {
        articleId,
        questionId,
        month,
      },
    },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Creates a new article analysis attempt
 * @param input - ArticleAnalysisAttempt input data
 * @returns Created ArticleAnalysisAttempt
 */
export async function createArticleAnalysisAttempt(
  input: CreateArticleAnalysisAttemptInput
): Promise<ArticleAnalysisAttempt> {
  return prisma.articleAnalysisAttempt.create({
    data: {
      articleId: input.articleId,
      questionId: input.questionId,
      month: input.month,
      stance: input.stance,
      confidence: input.confidence,
      reasoning: input.reasoning ?? null,
    },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Creates or updates an article analysis attempt (upsert by triad)
 * @param input - ArticleAnalysisAttempt input data
 * @returns Created or updated ArticleAnalysisAttempt
 */
export async function createOrUpdateArticleAnalysisAttempt(
  input: CreateArticleAnalysisAttemptInput
): Promise<ArticleAnalysisAttempt> {
  return prisma.articleAnalysisAttempt.upsert({
    where: {
      articleId_questionId_month: {
        articleId: input.articleId,
        questionId: input.questionId,
        month: input.month,
      },
    },
    create: {
      articleId: input.articleId,
      questionId: input.questionId,
      month: input.month,
      stance: input.stance,
      confidence: input.confidence,
      reasoning: input.reasoning ?? null,
    },
    update: {
      stance: input.stance,
      confidence: input.confidence,
      reasoning: input.reasoning ?? null,
      analyzedAt: new Date(),
    },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Updates an existing article analysis attempt
 * @param id - ArticleAnalysisAttempt ID
 * @param input - Update data
 * @returns Updated ArticleAnalysisAttempt
 */
export async function updateArticleAnalysisAttempt(
  id: string,
  input: UpdateArticleAnalysisInput
): Promise<ArticleAnalysisAttempt> {
  return prisma.articleAnalysisAttempt.update({
    where: { id },
    data: {
      ...input,
      reasoning: input.reasoning ?? undefined,
    },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Deletes an article analysis attempt
 * @param id - ArticleAnalysisAttempt ID
 * @returns Deleted ArticleAnalysisAttempt
 */
export async function deleteArticleAnalysisAttempt(id: string): Promise<ArticleAnalysisAttempt> {
  return prisma.articleAnalysisAttempt.delete({
    where: { id },
  });
}

/**
 * Counts article analysis attempts for a question in a specific month
 * @param questionId - Question ID
 * @param month - Month period (first day of month)
 * @returns Count
 */
export async function countArticleAnalysisAttemptsByQuestionAndMonth(
  questionId: string,
  month: Date
): Promise<number> {
  return prisma.articleAnalysisAttempt.count({
    where: {
      questionId,
      month,
    },
  });
}

