/**
 * Article Repository
 * Handles Article model operations
 */

import { prisma } from '../index';
import { normalizeUrl, isValidUrl } from '../utils/urlNormalizer';
import type { Article, CrawlRequest } from '@prisma/client';

export interface CreateArticleInput {
  url: string;
  crawlRequestId?: string | null;
  outletId: string;
  title: string;
  textContent: string;
  excerpt?: string | null;
  publishedDate?: Date | null;
}

export interface UpdateArticleInput {
  title?: string;
  textContent?: string;
  excerpt?: string | null;
  publishedDate?: Date | null;
}

/**
 * Finds an article by URL (normalized)
 * @param url - The URL to search for
 * @returns Article or null if not found
 */
export async function findArticleByUrl(url: string): Promise<Article | null> {
  if (!isValidUrl(url)) {
    return null;
  }
  
  const normalizedUrl = normalizeUrl(url);
  
  return prisma.article.findUnique({
    where: { url: normalizedUrl },
    include: {
      outlet: true,
      crawlRequest: true,
    },
  });
}

/**
 * Finds an article by crawl request ID
 * @param crawlRequestId - The crawl request ID
 * @returns Article or null if not found
 */
export async function findArticleByCrawlRequestId(
  crawlRequestId: string
): Promise<Article | null> {
  return prisma.article.findUnique({
    where: { crawlRequestId },
    include: {
      outlet: true,
      crawlRequest: true,
    },
  });
}

/**
 * Creates a new article with URL normalization
 * If an article with the same normalized URL already exists, updates it
 * @param input - Article input data
 * @returns Created or updated Article
 */
export async function createOrUpdateArticle(
  input: CreateArticleInput
): Promise<Article> {
  if (!isValidUrl(input.url)) {
    throw new Error(`Invalid URL: ${input.url}`);
  }
  
  const normalizedUrl = normalizeUrl(input.url);
  
  // Check if article already exists
  const existing = await prisma.article.findUnique({
    where: { url: normalizedUrl },
  });
  
  if (existing) {
    // Update existing article
    return prisma.article.update({
      where: { id: existing.id },
      data: {
        title: input.title,
        textContent: input.textContent,
        excerpt: input.excerpt ?? null,
        publishedDate: input.publishedDate ?? null,
        crawlRequestId: input.crawlRequestId ?? existing.crawlRequestId,
        // extractedAt is updated automatically via updatedAt
      },
    });
  }
  
  // Create new article
  return prisma.article.create({
    data: {
      url: normalizedUrl,
      outletId: input.outletId,
      crawlRequestId: input.crawlRequestId ?? null,
      title: input.title,
      textContent: input.textContent,
      excerpt: input.excerpt ?? null,
      publishedDate: input.publishedDate ?? null,
    },
  });
}

/**
 * Updates an existing article
 * @param id - Article ID
 * @param input - Update data
 * @returns Updated Article
 */
export async function updateArticle(
  id: string,
  input: UpdateArticleInput
): Promise<Article> {
  return prisma.article.update({
    where: { id },
    data: {
      ...input,
      excerpt: input.excerpt ?? undefined,
      publishedDate: input.publishedDate ?? undefined,
    },
  });
}

/**
 * Links an article to a crawl request
 * @param articleId - Article ID
 * @param crawlRequestId - CrawlRequest ID
 * @returns Updated Article
 */
export async function linkArticleToCrawlRequest(
  articleId: string,
  crawlRequestId: string
): Promise<Article> {
  return prisma.article.update({
    where: { id: articleId },
    data: { crawlRequestId },
  });
}

/**
 * Finds articles by outlet ID
 * @param outletId - Outlet ID
 * @param limit - Maximum number of articles to return
 * @param offset - Number of articles to skip
 * @returns Array of Articles
 */
export async function findArticlesByOutlet(
  outletId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Article[]> {
  return prisma.article.findMany({
    where: { outletId },
    orderBy: { extractedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      outlet: true,
      crawlRequest: true,
    },
  });
}

/**
 * Counts articles by outlet
 * @param outletId - Optional filter by outlet ID
 * @returns Total count
 */
export async function countArticles(outletId?: string): Promise<number> {
  const where = outletId ? { outletId } : {};
  return prisma.article.count({ where });
}

/**
 * Finds all articles with optional limit
 * @param limit - Maximum number of articles to return
 * @param offset - Number of articles to skip
 * @returns Array of Articles
 */
export async function findAllArticles(
  limit: number = 1000,
  offset: number = 0
): Promise<Article[]> {
  return prisma.article.findMany({
    orderBy: { extractedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      outlet: true,
      topicArticles: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Finds articles by topic ID
 * @param topicId - Topic ID
 * @param limit - Maximum number of articles to return
 * @param offset - Number of articles to skip
 * @returns Array of Articles
 */
export async function findArticlesByTopic(
  topicId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Article[]> {
  return prisma.article.findMany({
    where: {
      topicArticles: {
        some: {
          topicId,
        },
      },
    },
    orderBy: { extractedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      outlet: true,
      topicArticles: {
        where: { topicId },
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Finds articles by question ID (articles that have analyses for this question)
 * @param questionId - Question ID
 * @param limit - Maximum number of articles to return
 * @param offset - Number of articles to skip
 * @returns Array of Articles
 */
export async function findArticlesByQuestion(
  questionId: string,
  limit: number = 100,
  offset: number = 0
): Promise<Article[]> {
  return prisma.article.findMany({
    where: {
      articleAnalysisAttempts: {
        some: {
          questionId,
        },
      },
    },
    orderBy: { extractedAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      outlet: true,
      articleAnalysisAttempts: {
        where: { questionId },
      },
    },
  });
}

/**
 * Finds articles with their topic assignments
 * @param articleId - Article ID
 * @returns Article with topics
 */
export async function findArticleWithTopics(articleId: string): Promise<Article | null> {
  return prisma.article.findUnique({
    where: { id: articleId },
    include: {
      outlet: true,
      topicArticles: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Finds articles with their analyses
 * @param articleId - Article ID
 * @returns Article with analyses
 */
export async function findArticleWithAnalyses(articleId: string): Promise<Article | null> {
  return prisma.article.findUnique({
    where: { id: articleId },
    include: {
      outlet: true,
      articleAnalysisAttempts: {
        include: {
          question: {
            include: {
              topic: true,
            },
          },
        },
        orderBy: { analyzedAt: 'desc' },
      },
    },
  });
}

