/**
 * LLM Provider Errors
 * Custom error classes for LLM provider operations
 */

export class LLMProviderError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
    public readonly retryable: boolean = true
  ) {
    super(message);
    this.name = 'LLMProviderError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LLMProviderError);
    }
  }
}

export class LLMRateLimitError extends LLMProviderError {
  constructor(message: string = 'Rate limit exceeded', cause?: unknown) {
    super(message, cause, true);
    this.name = 'LLMRateLimitError';
  }
}

export class LLMInvalidKeyError extends LLMProviderError {
  constructor(message: string = 'Invalid API key', cause?: unknown) {
    super(message, cause, false);
    this.name = 'LLMInvalidKeyError';
  }
}

export class LLMTimeoutError extends LLMProviderError {
  constructor(message: string = 'Request timeout', cause?: unknown) {
    super(message, cause, true);
    this.name = 'LLMTimeoutError';
  }
}

export class LLMNetworkError extends LLMProviderError {
  constructor(message: string = 'Network error', cause?: unknown) {
    super(message, cause, true);
    this.name = 'LLMNetworkError';
  }
}

