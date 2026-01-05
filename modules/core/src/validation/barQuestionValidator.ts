/**
 * Bar Question Validator
 * Validates if questions are simple and conversational enough to be asked in a bar conversation
 */

import type { LLMProvider } from '../llm/provider';
import type { Question } from '@acta/db';
import { updateQuestion } from '@acta/db';

export interface BarQuestionValidationResult {
  question: Question;
  barReadinessScore: number; // 0-100 score
  confidence: number;
  reasoning: string;
  issues?: string[];
  suggestions?: string[];
  reformulatedQuestion?: string;
  reformulationScore?: number; // 0-100 score of reformulation
  wasReformulated?: boolean; // Whether the question was actually updated
}

/**
 * Validates if a question would be asked in a bar conversation and reformulates if needed
 * @param question - Question to validate
 * @param llmProvider - LLM provider for validation
 * @param autoApplyReformulation - Whether to automatically apply reformulation if question is invalid (default: false)
 * @returns Bar validation result
 */
export async function validateBarQuestion(
  question: Question & { topic?: { name: string } | null },
  llmProvider: LLMProvider,
  autoApplyReformulation: boolean = false
): Promise<BarQuestionValidationResult> {
  // Get topic name for validation
  const topicName = question.topic?.name || 'Unknown';
  
  // Validate using LLM
  const validationResult = await llmProvider.validateBarQuestion({
    question: question.questionText,
    topic: topicName,
  });
  
  // Determine if we should apply reformulation (if score is low and reformulation has higher score)
  const shouldReformulate = 
    validationResult.barReadinessScore < 70 && // Low bar readiness
    validationResult.reformulatedQuestion && 
    validationResult.reformulatedQuestion !== question.questionText &&
    validationResult.reformulationScore && 
    validationResult.reformulationScore > validationResult.barReadinessScore && // Reformulation is better
    autoApplyReformulation;
  
  let updatedQuestion = question;
  let wasReformulated = false;
  
  // Apply reformulation if needed
  if (shouldReformulate && validationResult.reformulatedQuestion) {
    // Store original question text if not already stored
    const originalText = question.originalQuestionText || question.questionText;
    
    // Update question with reformulated text
    updatedQuestion = await updateQuestion(question.id, {
      questionText: validationResult.reformulatedQuestion,
      originalQuestionText: originalText,
    });
    
    wasReformulated = true;
  }
  
  // Store validation results in question's validationResults JSON
  const currentValidationResults = (updatedQuestion.validationResults as any) || {};
  const barValidationResults = {
    barReadinessScore: validationResult.barReadinessScore,
    confidence: validationResult.confidence,
    reasoning: validationResult.reasoning,
    issues: validationResult.issues || [],
    suggestions: validationResult.suggestions || [],
    reformulatedQuestion: validationResult.reformulatedQuestion || undefined,
    reformulationScore: validationResult.reformulationScore || undefined,
    wasReformulated: wasReformulated,
    validatedAt: new Date().toISOString(),
  };
  
  // Update question in database with bar validation results
  updatedQuestion = await updateQuestion(updatedQuestion.id, {
    suggestions: validationResult.suggestions || [], // Store suggestions in dedicated column
    validationResults: {
      ...currentValidationResults,
      barValidation: barValidationResults,
    },
  });
  
  return {
    question: updatedQuestion,
    barReadinessScore: validationResult.barReadinessScore,
    confidence: validationResult.confidence,
    reasoning: validationResult.reasoning,
    issues: validationResult.issues,
    suggestions: validationResult.suggestions,
    reformulatedQuestion: validationResult.reformulatedQuestion,
    reformulationScore: validationResult.reformulationScore,
    wasReformulated,
  };
}

/**
 * Validates multiple questions for bar conversation suitability
 * @param questions - Array of questions to validate (should include topic relation)
 * @param llmProvider - LLM provider for validation
 * @param autoApplyReformulation - Whether to automatically apply reformulation if question is invalid (default: false)
 * @returns Array of validation results
 */
export async function validateBarQuestions(
  questions: Array<Question & { topic?: { name: string } | null }>,
  llmProvider: LLMProvider,
  autoApplyReformulation: boolean = false
): Promise<BarQuestionValidationResult[]> {
  const results: BarQuestionValidationResult[] = [];
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((question) => validateBarQuestion(question, llmProvider, autoApplyReformulation))
    );
    results.push(...batchResults);
  }
  
  return results;
}

