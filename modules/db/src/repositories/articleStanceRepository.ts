/**
 * ArticleStance Repository
 * Handles ArticleStance operations for tracking successfully classified article stances
 * 
 * Note: This table only stores stances that resulted in successful classifications.
 * Rejected/unclear classifications are stored in ArticleAnalysisAttempt but not linked here.
 */

import { prisma } from '../index.js';
import type { ArticleStance } from '@prisma/client';

export interface CreateArticleStanceInput {
  articleId: string;
  questionId: string;
  articleAnalysisAttemptId: string; // Required - only successful classifications are stored
}

/**
 * Finds an article stance by ID
 * @param id - ArticleStance ID
 * @returns ArticleStance or null if not found
 */
export async function findArticleStanceById(
  id: string
): Promise<ArticleStance | null> {
  return prisma.articleStance.findUnique({
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
      articleAnalysisAttempt: true,
    },
  });
}

/**
 * Finds article stances by article ID
 * @param articleId - Article ID
 * @returns Array of ArticleStances
 */
export async function findArticleStancesByArticleId(
  articleId: string
): Promise<ArticleStance[]> {
  return prisma.articleStance.findMany({
    where: { articleId },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
      articleAnalysisAttempt: true,
    },
    orderBy: { matchedAt: 'desc' },
  });
}

/**
 * Finds article stances by question ID
 * @param questionId - Question ID
 * @returns Array of ArticleStances
 */
export async function findArticleStancesByQuestionId(
  questionId: string
): Promise<ArticleStance[]> {
  return prisma.articleStance.findMany({
    where: { questionId },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
      articleAnalysisAttempt: true,
    },
    orderBy: { matchedAt: 'desc' },
  });
}

/**
 * Finds an article stance by article and question IDs
 * @param articleId - Article ID
 * @param questionId - Question ID
 * @returns ArticleStance or null if not found
 */
export async function findArticleStanceByArticleAndQuestion(
  articleId: string,
  questionId: string
): Promise<ArticleStance | null> {
  return prisma.articleStance.findUnique({
    where: {
      articleId_questionId: {
        articleId,
        questionId,
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
      articleAnalysisAttempt: true,
    },
  });
}

/**
 * Creates a new article stance (only for successfully classified matches)
 * @param input - ArticleStance input data
 * @returns Created ArticleStance
 */
export async function createArticleStance(
  input: CreateArticleStanceInput
): Promise<ArticleStance> {
  return prisma.articleStance.create({
    data: {
      articleId: input.articleId,
      questionId: input.questionId,
      articleAnalysisAttemptId: input.articleAnalysisAttemptId,
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
      articleAnalysisAttempt: true,
    },
  });
}

/**
 * Deletes an article stance
 * @param id - ArticleStance ID
 * @returns Deleted ArticleStance
 */
export async function deleteArticleStance(id: string): Promise<ArticleStance> {
  return prisma.articleStance.delete({
    where: { id },
  });
}

/**
 * Deletes an article stance by article and question IDs
 * @param articleId - Article ID
 * @param questionId - Question ID
 * @returns Deleted ArticleStance
 */
export async function deleteArticleStanceByArticleAndQuestion(
  articleId: string,
  questionId: string
): Promise<ArticleStance> {
  return prisma.articleStance.delete({
    where: {
      articleId_questionId: {
        articleId,
        questionId,
      },
    },
  });
}

/**
 * Finds article stances by question ID and month period
 * @param questionId - Question ID
 * @param month - Month period (first day of month)
 * @returns Array of ArticleStances with article and outlet information
 */
export async function findArticleStancesByQuestionAndMonth(
  questionId: string,
  month: Date
): Promise<Array<ArticleStance & {
  article: {
    outlet: {
      id: string;
      credibilityScore: number;
      ideology: string;
    };
  };
  articleAnalysisAttempt: {
    stance: string;
    confidence: number;
  };
}>> {
  // Ensure month is normalized to first day of month
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1, 0, 0, 0, 0);

  return prisma.articleStance.findMany({
    where: {
      questionId,
      articleAnalysisAttempt: {
        month: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
    },
    include: {
      article: {
        include: {
          outlet: {
            select: {
              id: true,
              credibilityScore: true,
              ideology: true,
            },
          },
        },
      },
      articleAnalysisAttempt: {
        select: {
          stance: true,
          confidence: true,
        },
      },
    },
    orderBy: { matchedAt: 'desc' },
  });
}

/**
 * Counts articles with stances on a question (only successfully classified)
 * @param questionId - Question ID
 * @returns Count
 */
export async function countArticlesByQuestion(questionId: string): Promise<number> {
  return prisma.articleStance.count({
    where: { questionId },
  });
}
