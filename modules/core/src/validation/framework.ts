/**
 * Validation Framework
 * LLM-based framework for validating questions against a formulation framework
 */

import type {
  ValidationResult,
  ValidationFrameworkConfig,
} from './types.js';
import type { LLMProvider } from '../llm/provider.js';

export class ValidationFramework {
  private config: ValidationFrameworkConfig;
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider, config?: ValidationFrameworkConfig) {
    this.llmProvider = llmProvider;
    this.config = {
      requireAllChecks: true,
      minConfidence: 0.7,
      ...config,
    };
  }

  /**
   * Validates a question using LLM provider
   * @param question - Question text to validate
   * @param topic - Topic name
   * @param context - Optional context (e.g., article content)
   * @returns Validation result with all check results
   */
  async validate(
    question: string,
    topic: string,
    context?: string
  ): Promise<ValidationResult> {
    // Use LLM provider for validation
    const llmResult = await this.llmProvider.validateQuestion({
      question,
      topic,
      context,
    });

    // Convert LLM result to ValidationResult format
    const checks = llmResult.checks.map((check) => ({
      name: check.name,
      passed: check.passed,
      confidence: check.confidence,
      notes: check.notes,
    }));

    const passedChecks = checks.filter((c) => c.passed);
    const isValid = this.config.requireAllChecks
      ? passedChecks.length === checks.length
      : passedChecks.length > 0;

    return {
      isValid: isValid && llmResult.overallConfidence >= (this.config.minConfidence || 0),
      checks,
      overallConfidence: llmResult.overallConfidence,
      suggestions: llmResult.suggestions,
    };
  }

  /**
   * Gets the LLM provider being used
   * @returns LLM provider instance
   */
  getLLMProvider(): LLMProvider {
    return this.llmProvider;
  }
}

