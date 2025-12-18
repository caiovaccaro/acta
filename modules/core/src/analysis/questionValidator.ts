/**
 * Question Validator
 * Validates questions using the validation framework and LLM provider
 * Supports reformulation when validation fails
 */

import type { LLMProvider } from '../llm/provider.js';
import type { ValidationFramework } from '../validation/framework.js';
import type { Question } from '@acta/db';
import {
  updateQuestion,
  activateQuestion,
  deactivateQuestion,
} from '@acta/db';
import type { QuestionValidationStatus } from '@prisma/client';

export interface QuestionValidationResult {
  question: Question;
  isValid: boolean;
  validationStatus: QuestionValidationStatus;
  validationResults: Record<string, unknown>;
  reformulations?: Array<{
    text: string;
    improvements: string[];
    confidence: number;
  }>;
}

/**
 * Validates a question using the validation framework
 * @param question - Question to validate
 * @param validationFramework - Validation framework instance
 * @param context - Optional article context for validation
 * @returns Validation result
 */
export async function validateQuestion(
  question: Question & { topic?: { name: string } | null },
  validationFramework: ValidationFramework,
  context?: string
): Promise<QuestionValidationResult> {
  // Get topic name for validation
  const topicName = question.topic?.name || 'Unknown';
  
  // Validate using framework
  const validationResult = await validationFramework.validate(
    question.questionText,
    topicName,
    context
  );
  
  // Determine validation status
  let validationStatus: QuestionValidationStatus = 'pending';
  if (validationResult.isValid) {
    validationStatus = 'validated';
  } else {
    validationStatus = 'needs_reformulation';
  }
  
  // Store validation results
  const validationResults = {
    isValid: validationResult.isValid,
    overallConfidence: validationResult.overallConfidence,
    checks: validationResult.checks.map((check) => ({
      name: check.name,
      passed: check.passed,
      confidence: check.confidence,
      notes: check.notes,
    })),
    suggestions: validationResult.suggestions,
  };
  
  // Update question in database
  await updateQuestion(question.id, {
    validationStatus,
    validationResults,
  });
  
  return {
    question: {
      ...question,
      validationStatus,
      validationResults,
    } as Question,
    isValid: validationResult.isValid,
    validationStatus,
    validationResults,
  };
}

/**
 * Validates and reformulates a question if validation fails
 * @param question - Question to validate and potentially reformulate
 * @param validationFramework - Validation framework instance
 * @param llmProvider - LLM provider for reformulation
 * @param context - Optional article context
 * @returns Validation result with reformulations if needed
 */
export async function validateAndReformulateQuestion(
  question: Question & { topic?: { name: string } | null },
  validationFramework: ValidationFramework,
  llmProvider: LLMProvider,
  context?: string
): Promise<QuestionValidationResult> {
  // First, validate the question
  const validationResult = await validateQuestion(
    question,
    validationFramework,
    context
  );
  
  // If validation failed, get reformulations
  if (!validationResult.isValid && validationResult.validationResults.checks) {
    const failedChecks = (validationResult.validationResults.checks as Array<{ name: string; passed: boolean }>)
      .filter((check) => !check.passed)
      .map((check) => check.name);
    
    if (failedChecks.length > 0) {
      const topicName = question.topic?.name || 'Unknown';
      const reformulations = await llmProvider.reformulateQuestion({
        originalQuestion: question.questionText,
        failedChecks,
        topic: topicName,
      });
      
      validationResult.reformulations = reformulations;
    }
  }
  
  return validationResult;
}

/**
 * Activates a validated question
 * @param question - Question to activate
 * @returns Updated question
 */
export async function activateValidatedQuestion(
  question: Question
): Promise<Question> {
  if (question.validationStatus !== 'validated') {
    throw new Error(
      `Cannot activate question ${question.id}: validation status is ${question.validationStatus}, must be 'validated'`
    );
  }
  
  return activateQuestion(question.id);
}

/**
 * Validates and activates a question if it passes validation
 * @param question - Question to validate and activate
 * @param validationFramework - Validation framework instance
 * @param context - Optional article context
 * @returns Updated question if activated, null if validation failed
 */
export async function validateAndActivateQuestion(
  question: Question,
  validationFramework: ValidationFramework,
  context?: string
): Promise<Question | null> {
  const validationResult = await validateQuestion(
    question,
    validationFramework,
    context
  );
  
  if (validationResult.isValid) {
    return activateValidatedQuestion(validationResult.question);
  }
  
  return null;
}

