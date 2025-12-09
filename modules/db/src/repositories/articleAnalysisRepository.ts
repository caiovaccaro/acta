/**
 * ArticleAnalysis Repository
 * Handles ArticleAnalysis model operations
 */

import { prisma } from '../index.js';
import type { ArticleAnalysis, Stance } from '@prisma/client';

export interface CreateArticleAnalysisInput {
  articleId: string;
  questionId: string;
  month: Date; // Should be first day of month (YYYY-MM-01)
  stance: Stance;
  confidence: number; // 0-1
  reasoning?: string | null;
}

export interface UpdateArticleAnalysisInput {
  stance?: Stance;
  confidence?: number;
  reasoning?: string | null;
}

/**
 * Finds an article analysis by ID
 * @param id - ArticleAnalysis ID
 * @returns ArticleAnalysis or null if not found
 */
export async function findArticleAnalysisById(
  id: string
): Promise<ArticleAnalysis | null> {
  return prisma.articleAnalysis.findUnique({
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
 * Finds article analyses by article ID
 * @param articleId - Article ID
 * @returns Array of ArticleAnalyses
 */
export async function findArticleAnalysesByArticleId(
  articleId: string
): Promise<ArticleAnalysis[]> {
  return prisma.articleAnalysis.findMany({
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
 * Finds article analyses by question ID
 * @param questionId - Question ID
 * @param month - Optional month filter (first day of month)
 * @returns Array of ArticleAnalyses
 */
export async function findArticleAnalysesByQuestionId(
  questionId: string,
  month?: Date
): Promise<ArticleAnalysis[]> {
  return prisma.articleAnalysis.findMany({
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
 * Finds article analysis by article, question, and month (unique triad)
 * @param articleId - Article ID
 * @param questionId - Question ID
 * @param month - Month period (first day of month)
 * @returns ArticleAnalysis or null if not found
 */
export async function findArticleAnalysisByTriad(
  articleId: string,
  questionId: string,
  month: Date
): Promise<ArticleAnalysis | null> {
  return prisma.articleAnalysis.findUnique({
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
 * Creates a new article analysis
 * @param input - ArticleAnalysis input data
 * @returns Created ArticleAnalysis
 */
export async function createArticleAnalysis(
  input: CreateArticleAnalysisInput
): Promise<ArticleAnalysis> {
  return prisma.articleAnalysis.create({
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
 * Creates or updates an article analysis (upsert by triad)
 * @param input - ArticleAnalysis input data
 * @returns Created or updated ArticleAnalysis
 */
export async function createOrUpdateArticleAnalysis(
  input: CreateArticleAnalysisInput
): Promise<ArticleAnalysis> {
  return prisma.articleAnalysis.upsert({
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
 * Updates an existing article analysis
 * @param id - ArticleAnalysis ID
 * @param input - Update data
 * @returns Updated ArticleAnalysis
 */
export async function updateArticleAnalysis(
  id: string,
  input: UpdateArticleAnalysisInput
): Promise<ArticleAnalysis> {
  return prisma.articleAnalysis.update({
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
 * Deletes an article analysis
 * @param id - ArticleAnalysis ID
 * @returns Deleted ArticleAnalysis
 */
export async function deleteArticleAnalysis(id: string): Promise<ArticleAnalysis> {
  return prisma.articleAnalysis.delete({
    where: { id },
  });
}

/**
 * Counts article analyses for a question in a specific month
 * @param questionId - Question ID
 * @param month - Month period (first day of month)
 * @returns Count
 */
export async function countArticleAnalysesByQuestionAndMonth(
  questionId: string,
  month: Date
): Promise<number> {
  return prisma.articleAnalysis.count({
    where: {
      questionId,
      month,
    },
  });
}

