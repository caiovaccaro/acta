/**
 * CrawlRequest Repository
 * Handles CrawlRequest model operations with URL normalization and deduplication
 */

import { prisma, CrawlStatus } from '../index.js';
import { normalizeUrl, isValidUrl } from '../utils/urlNormalizer.js';
import type { CrawlRequest } from '@prisma/client';

/**
 * Maximum number of retry attempts before giving up on a crawl request
 * Default: 3 attempts (initial attempt + 2 retries)
 */
export const MAX_RETRY_ATTEMPTS = 3;

export interface CreateCrawlRequestInput {
  url: string;
  outletId: string;
  status?: CrawlStatus;
}

/**
 * Checks if a crawl request has exceeded the maximum retry attempts
 * @param attempts - Number of attempts made
 * @param maxAttempts - Maximum allowed attempts (defaults to MAX_RETRY_ATTEMPTS)
 * @returns True if exceeded, false otherwise
 */
export function hasExceededRetryLimit(
  attempts: number,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): boolean {
  return attempts >= maxAttempts;
}

/**
 * Finds a crawl request by URL (normalized)
 * @param url - The URL to search for
 * @returns CrawlRequest or null if not found
 */
export async function findCrawlRequestByUrl(url: string): Promise<CrawlRequest | null> {
  if (!isValidUrl(url)) {
    return null;
  }
  
  const normalizedUrl = normalizeUrl(url);
  
  return prisma.crawlRequest.findUnique({
    where: { url: normalizedUrl },
  });
}

/**
 * Creates a new crawl request with URL normalization
 * If a crawl request with the same normalized URL already exists, returns the existing one
 * @param input - CrawlRequest input data
 * @returns Created or existing CrawlRequest
 */
export async function createOrUpdateCrawlRequest(
  input: CreateCrawlRequestInput
): Promise<CrawlRequest> {
  if (!isValidUrl(input.url)) {
    throw new Error(`Invalid URL: ${input.url}`);
  }
  
  const normalizedUrl = normalizeUrl(input.url);
  
  // Check if already exists
  const existing = await prisma.crawlRequest.findUnique({
    where: { url: normalizedUrl },
  });
  
  if (existing) {
    // If exists and is pending, return it (idempotent)
    // If exists and failed, check retry limit before resetting
    if (existing.status === CrawlStatus.failed) {
      // Check if we've exceeded retry limit
      if (hasExceededRetryLimit(existing.attempts)) {
        // Already exceeded limit, return as-is (stays failed)
        return existing;
      }
      
      // Still within retry limit, reset to pending for retry
      return prisma.crawlRequest.update({
        where: { id: existing.id },
        data: {
          status: CrawlStatus.pending,
          attempts: existing.attempts + 1,
          errorMessage: null,
        },
      });
    }
    
    // If done or in_progress, return existing
    return existing;
  }
  
  // Create new crawl request
  return prisma.crawlRequest.create({
    data: {
      url: normalizedUrl,
      outletId: input.outletId,
      status: input.status || CrawlStatus.pending,
    },
  });
}

/**
 * Creates multiple crawl requests in batch
 * Handles deduplication and URL normalization
 * @param inputs - Array of CrawlRequest input data
 * @returns Array of created or existing CrawlRequests
 */
export async function createOrUpdateCrawlRequestsBatch(
  inputs: CreateCrawlRequestInput[]
): Promise<CrawlRequest[]> {
  const results: CrawlRequest[] = [];
  
  for (const input of inputs) {
    try {
      const result = await createOrUpdateCrawlRequest(input);
      results.push(result);
    } catch (error) {
      console.error(`Failed to create crawl request for ${input.url}:`, error);
      // Continue with other requests
    }
  }
  
  return results;
}

/**
 * Finds pending crawl requests that haven't exceeded retry limits
 * @param limit - Maximum number of requests to return
 * @param outletId - Optional filter by outlet ID
 * @param maxAttempts - Maximum allowed attempts (defaults to MAX_RETRY_ATTEMPTS)
 * @returns Array of pending CrawlRequests that are eligible for retry
 */
export async function findPendingCrawlRequests(
  limit: number = 100,
  outletId?: string,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<CrawlRequest[]> {
  return prisma.crawlRequest.findMany({
    where: {
      status: CrawlStatus.pending,
      attempts: {
        lt: maxAttempts, // Only include requests that haven't exceeded retry limit
      },
      ...(outletId && { outletId }),
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: limit,
  });
}

/**
 * Updates crawl request status
 * @param id - CrawlRequest ID
 * @param status - New status
 * @param errorMessage - Optional error message
 * @param maxAttempts - Maximum allowed attempts (defaults to MAX_RETRY_ATTEMPTS)
 * @returns Updated CrawlRequest
 */
export async function updateCrawlRequestStatus(
  id: string,
  status: CrawlStatus,
  errorMessage?: string | null,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<CrawlRequest> {
  // Get current request to check attempts
  const current = await prisma.crawlRequest.findUnique({
    where: { id },
    select: { attempts: true },
  });
  
  if (!current) {
    throw new Error(`CrawlRequest with id ${id} not found`);
  }
  
  const updateData: {
    status: CrawlStatus;
    attempts?: { increment: number };
    errorMessage?: string | null;
  } = {
    status,
    errorMessage: errorMessage ?? null,
  };
  
  if (status === CrawlStatus.in_progress || status === CrawlStatus.failed) {
    const newAttempts = current.attempts + 1;
    updateData.attempts = { increment: 1 };
    
    // If marking as failed and we've exceeded retry limit, ensure it stays failed
    if (status === CrawlStatus.failed && hasExceededRetryLimit(newAttempts, maxAttempts)) {
      // Add note to error message about retry limit
      const retryLimitMessage = ` (Max retries exceeded: ${newAttempts}/${maxAttempts})`;
      updateData.errorMessage = errorMessage 
        ? `${errorMessage}${retryLimitMessage}`
        : retryLimitMessage;
    }
  }
  
  return prisma.crawlRequest.update({
    where: { id },
    data: updateData,
  });
}

/**
 * Marks crawl requests as in progress
 * @param ids - Array of CrawlRequest IDs
 * @returns Updated CrawlRequests
 */
export async function markCrawlRequestsInProgress(
  ids: string[]
): Promise<CrawlRequest[]> {
  if (ids.length === 0) {
    return [];
  }
  
  return prisma.$transaction(
    ids.map(id =>
      prisma.crawlRequest.update({
        where: { id },
        data: {
          status: CrawlStatus.in_progress,
          attempts: { increment: 1 },
        },
      })
    )
  );
}

/**
 * Counts crawl requests by status
 * @param outletId - Optional filter by outlet ID
 * @param maxAttempts - Maximum allowed attempts for filtering (defaults to MAX_RETRY_ATTEMPTS)
 * @returns Object with counts for each status, including failedExceededRetries
 */
export async function countCrawlRequestsByStatus(
  outletId?: string,
  maxAttempts: number = MAX_RETRY_ATTEMPTS
): Promise<Record<CrawlStatus, number> & { failedExceededRetries: number }> {
  const where = outletId ? { outletId } : {};
  
  const [pending, inProgress, done, failed, failedExceededRetries] = await Promise.all([
    prisma.crawlRequest.count({ 
      where: { 
        ...where, 
        status: CrawlStatus.pending,
        attempts: { lt: maxAttempts }, // Only count eligible pending requests
      } 
    }),
    prisma.crawlRequest.count({ where: { ...where, status: CrawlStatus.in_progress } }),
    prisma.crawlRequest.count({ where: { ...where, status: CrawlStatus.done } }),
    prisma.crawlRequest.count({ where: { ...where, status: CrawlStatus.failed } }),
    prisma.crawlRequest.count({ 
      where: { 
        ...where, 
        status: CrawlStatus.failed,
        attempts: { gte: maxAttempts },
      } 
    }),
  ]);
  
  return {
    [CrawlStatus.pending]: pending,
    [CrawlStatus.in_progress]: inProgress,
    [CrawlStatus.done]: done,
    [CrawlStatus.failed]: failed,
    failedExceededRetries,
  };
}

