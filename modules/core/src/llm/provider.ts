/**
 * LLM Provider Interface
 * Abstract interface for LLM providers (OpenAI, Anthropic, etc.)
 */

import type {
  ClassifyStanceParams,
  StanceClassification,
  ValidateQuestionParams,
  QuestionValidation,
  BatchClassifyStancesParams,
  QuestionReformulation,
  ReformulateQuestionParams,
  ValidateBarQuestionParams,
  BarQuestionValidation,
} from './types.js';

// Re-export types for convenience
export type {
  ClassifyStanceParams,
  StanceClassification,
  ValidateQuestionParams,
  QuestionValidation,
  BatchClassifyStancesParams,
  QuestionReformulation,
  ReformulateQuestionParams,
  ValidateBarQuestionParams,
  BarQuestionValidation,
  Stance,
} from './types.js';

/**
 * LLM Provider Interface
 * All LLM providers must implement this interface
 */
export interface LLMProvider {
  /**
   * Classify stance for an article-question pair
   * @param params - Classification parameters
   * @returns Stance classification with confidence and reasoning
   */
  classifyStance(params: ClassifyStanceParams): Promise<StanceClassification>;

  /**
   * Validate a question against the formulation framework
   * @param params - Validation parameters
   * @returns Validation results with check details
   */
  validateQuestion(params: ValidateQuestionParams): Promise<QuestionValidation>;

  /**
   * Batch classify multiple stances (for cost optimization)
   * @param params - Batch classification parameters
   * @returns Array of stance classifications
   */
  batchClassifyStances(
    params: BatchClassifyStancesParams
  ): Promise<StanceClassification[]>;

  /**
   * Generate reformulated question versions
   * @param params - Reformulation parameters
   * @returns Array of reformulated questions with improvements
   */
  reformulateQuestion(
    params: ReformulateQuestionParams
  ): Promise<QuestionReformulation[]>;

  /**
   * Validate if a question would be asked in a bar conversation
   * Checks if the question is simple, non-technical, and understandable by average person
   * @param params - Bar validation parameters
   * @returns Bar validation result
   */
  validateBarQuestion(
    params: ValidateBarQuestionParams
  ): Promise<BarQuestionValidation>;

  /**
   * Get provider name
   * @returns Provider identifier string
   */
  getName(): string;

  /**
   * Check if provider is available
   * @returns True if provider is available, false otherwise
   */
  isAvailable(): Promise<boolean>;
}

