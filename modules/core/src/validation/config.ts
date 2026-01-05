/**
 * Validation Framework Configuration
 * Factory functions for creating validation frameworks with LLM providers
 */

import { ValidationFramework } from './framework';
import type { LLMProvider } from '../llm/provider';

/**
 * Creates a validation framework that uses LLM provider
 * @param llmProvider - LLM provider instance
 * @param requireAllChecks - Whether all checks must pass (default: true)
 * @param minConfidence - Minimum overall confidence (default: 0.7)
 * @returns Validation framework instance
 */
export function createLLMValidationFramework(
  llmProvider: LLMProvider,
  requireAllChecks: boolean = true,
  minConfidence: number = 0.7
): ValidationFramework {
  return new ValidationFramework(llmProvider, {
    requireAllChecks,
    minConfidence,
  });
}

/**
 * Creates a validation framework with default settings (LLM-based)
 * @param llmProvider - LLM provider instance
 * @param requireAllChecks - Whether all checks must pass (default: true)
 * @param minConfidence - Minimum overall confidence (default: 0.7)
 * @returns Validation framework instance
 */
export function createDefaultValidationFramework(
  llmProvider: LLMProvider,
  requireAllChecks: boolean = true,
  minConfidence: number = 0.7
): ValidationFramework {
  return createLLMValidationFramework(llmProvider, requireAllChecks, minConfidence);
}

