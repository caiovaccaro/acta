/**
 * Retry Utility
 * Implements exponential backoff retry logic for LLM API calls
 */

import {
  LLMProviderError,
  LLMRateLimitError,
  LLMTimeoutError,
} from '../errors.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries a function with exponential backoff
 * @param fn - Function to retry
 * @param options - Retry options
 * @returns Result of the function
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if error is not retryable
      if (error instanceof LLMProviderError && !error.retryable) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
        opts.maxDelay
      );

      // For rate limit errors, use retry-after if available
      if (error instanceof LLMRateLimitError) {
        const retryAfter = (error as any).retryAfter;
        if (retryAfter && retryAfter > 0) {
          await sleep(retryAfter * 1000);
          continue;
        }
      }

      await sleep(delay);
    }
  }

  throw lastError!;
}

