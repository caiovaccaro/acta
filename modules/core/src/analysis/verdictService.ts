/**
 * Verdict Service
 * Service layer for calculating and storing verdicts
 * 
 * This service:
 * - Fetches article stances for questions
 * - Calculates verdicts using the verdict calculator
 * - Stores verdicts in the database
 * - Handles monthly verdict calculation
 */

import type { Question, Verdict } from '@acta/db';
import {
  findArticleStancesByQuestionAndMonth,
  findArticleStancesByQuestionId,
} from '@acta/db';
import {
  createOrUpdateVerdict,
  findVerdictByQuestionId,
} from '@acta/db';
import { calculateVerdict } from './verdictCalculator';
import { getMonthPeriod, getCurrentMonthPeriod } from '../utils/monthPeriod';
import type { Stance, VerdictLabel, Ideology } from '@prisma/client';

/**
 * Calculates and stores verdict for a single question
 * 
 * @param questionId - Question ID
 * @param month - Month period (optional, defaults to current month)
 * @returns Created or updated Verdict
 */
export async function calculateAndStoreVerdict(
  questionId: string,
  month?: Date
): Promise<Verdict> {
  const monthPeriod = month ? getMonthPeriod(month) : getCurrentMonthPeriod();

  // Fetch article stances for this question and month
  const stances = await findArticleStancesByQuestionAndMonth(
    questionId,
    monthPeriod
  );

  // Convert to format expected by calculator
  const stancesForCalculation = stances.map((stance) => ({
    stance: stance.articleAnalysisAttempt.stance as Stance,
    confidence: stance.articleAnalysisAttempt.confidence,
    article: {
      outlet: {
        id: stance.article.outlet.id,
        credibilityScore: stance.article.outlet.credibilityScore,
        ideology: stance.article.outlet.ideology as Ideology,
      },
    },
  }));

  // Calculate verdict
  const result = calculateVerdict(stancesForCalculation, monthPeriod);

  // Store verdict (with month period for unique constraint)
  const verdict = await createOrUpdateVerdict({
    questionId,
    month: monthPeriod, // Store the month period for unique constraint
    verdictLabel: result.verdictLabel as VerdictLabel,
    confidence: result.confidence,
    supportShare: result.supportShare,
    variance: result.variance,
  });

  return verdict;
}

/**
 * Calculates and stores verdicts for multiple questions
 * 
 * @param questionIds - Array of question IDs
 * @param month - Month period (optional, defaults to current month)
 * @returns Array of created or updated Verdicts
 */
export async function calculateAndStoreVerdicts(
  questionIds: string[],
  month?: Date
): Promise<Verdict[]> {
  const verdicts: Verdict[] = [];

  for (const questionId of questionIds) {
    try {
      const verdict = await calculateAndStoreVerdict(questionId, month);
      verdicts.push(verdict);
    } catch (error) {
      console.error(`Error calculating verdict for question ${questionId}:`, error);
      // Continue with other questions
    }
  }

  return verdicts;
}

/**
 * Calculates and stores verdicts for all active questions
 * 
 * @param month - Month period (optional, defaults to current month)
 * @returns Array of created or updated Verdicts
 */
export async function calculateAndStoreAllVerdicts(
  month?: Date
): Promise<Verdict[]> {
  const { findActiveQuestions } = await import('@acta/db');
  
  const activeQuestions = await findActiveQuestions();
  const questionIds = activeQuestions.map((q) => q.id);

  return calculateAndStoreVerdicts(questionIds, month);
}

/**
 * Recalculates verdict for a question (useful when new articles are analyzed)
 * 
 * @param questionId - Question ID
 * @param month - Month period (optional, defaults to current month)
 * @returns Updated Verdict
 */
export async function recalculateVerdict(
  questionId: string,
  month?: Date
): Promise<Verdict> {
  return calculateAndStoreVerdict(questionId, month);
}

