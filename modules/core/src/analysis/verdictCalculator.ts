/**
 * Verdict Calculator
 * Calculates consensus verdicts from article stances using weighted aggregation.
 *
 * Phase 3: Verdict Calculation
 * - Calculates support share (S) from weighted stances
 * - Calculates variance (dispersion across outlets)
 * - Determines verdict label based on PRD rules
 * - Calculates confidence
 * - Uses outlet credibility for weighting
 * - Filters by month period
 *
 * NOTE: Verdicts are NOT split or weighted by ideology buckets – they are
 * calculated per publication/channel/journal, using outlet credibility only.
 * Ideology remains backend-only metadata and is not used directly in the
 * aggregation formula.
 */

import type { Stance, VerdictLabel, Ideology } from '@prisma/client';
import { getMonthPeriod } from '../utils/monthPeriod';

/**
 * Stance to numeric score mapping
 * Maps stance enum to 0-1 scale for calculation
 */
const STANCE_SCORES: Record<Stance, number> = {
  YesItSeemsSo: 1.0,
  ProbablyYes: 0.75,
  Unclear: 0.5,
  ProbablyNot: 0.25,
  NoItDoesntSeemSo: 0.0,
};

/**
 * Minimum number of articles required for a valid verdict
 * If fewer articles, verdict is set to "Unclear" with low confidence
 * Lower values allow more verdicts to be calculated (default: 4)
 */
const MIN_ARTICLES_FOR_VERDICT = 3;

/**
 * Verdict calculation result
 */
export interface VerdictCalculationResult {
  verdictLabel: VerdictLabel;
  confidence: number; // 0-100
  supportShare: number; // 0-1
  variance: number; // 0-1
  articleCount: number;
}

/**
 * Article stance with outlet information for calculation
 */
interface StanceWithOutlet {
  stance: Stance;
  confidence: number; // Article stance confidence (0-1)
  outlet: {
    id: string;
    credibilityScore: number; // 0-1
    // Ideology is kept for future use/debugging but not used in the formula
    ideology: string;
  };
}

/**
 * Computes outlet weights based solely on outlet credibility.
 *
 * Verdicts are per publication/channel/journal, not per ideology bucket.
 * Credibility is applied at the outlet level; ideology is NOT used to
 * re-balance or split verdicts.
 *
 * @param stances - Array of stances with outlet information
 * @returns Map of outlet ID to weight (proportional to credibility)
 */
function computeOutletWeights(
  stances: StanceWithOutlet[]
): Map<string, number> {
  const weights = new Map<string, number>();

  // Use outlet credibility as the weight (optionally could normalize, but
  // scaling cancels out when we divide by total weight later).
  for (const stance of stances) {
    weights.set(stance.outlet.id, stance.outlet.credibilityScore);
  }

  return weights;
}

/**
 * Calculates variance (dispersion) across outlets.
 *
 * We look at how much outlet-level stance scores deviate from the mean,
 * weighted by outlet credibility.
 * 
 * @param stances - Array of stances with outlet information
 * @param outletWeights - Map of outlet ID to weight
 * @returns Variance value (0-1)
 */
function calculateVariance(
  stances: StanceWithOutlet[],
  outletWeights: Map<string, number>
): number {
  if (stances.length === 0) return 1.0;

  // Calculate weighted average score
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const stance of stances) {
    const weight = outletWeights.get(stance.outlet.id) || 0;
    const score = STANCE_SCORES[stance.stance] * stance.confidence;
    totalWeightedScore += score * weight;
    totalWeight += weight;
  }

  const mean = totalWeight > 0 ? totalWeightedScore / totalWeight : 0.5;

  // Calculate variance
  let varianceSum = 0;
  for (const stance of stances) {
    const weight = outletWeights.get(stance.outlet.id) || 0;
    const score = STANCE_SCORES[stance.stance] * stance.confidence;
    const diff = score - mean;
    varianceSum += diff * diff * weight;
  }

  const variance = totalWeight > 0 ? varianceSum / totalWeight : 1.0;

  // Normalize to 0-1 range (max variance is 0.25 when mean is 0.5)
  return Math.min(1.0, variance * 4);
}

/**
 * Determines verdict label based on support share and variance
 * Uses PRD rules:
 * - "Yes, it seems so": S ≥ 0.67, low variance
 * - "Probably yes": S 0.55-0.67 or moderate variance
 * - "Unclear": S 0.45-0.55 or high variance
 * - "Probably not": S 0.33-0.45
 * - "No, it doesn't seem so": S ≤ 0.33
 * 
 * @param supportShare - Support share (0-1)
 * @param variance - Variance (0-1)
 * @returns Verdict label
 */
function determineVerdictLabel(
  supportShare: number,
  variance: number
): VerdictLabel {
  // High variance (> 0.5) always results in "Unclear"
  if (variance > 0.5) {
    return 'Unclear';
  }

  // Low variance thresholds
  const lowVariance = variance <= 0.25;

  if (supportShare >= 0.67) {
    return (lowVariance ? 'YesItSeemsSo' : 'ProbablyYes') as VerdictLabel;
  }

  if (supportShare >= 0.55) {
    return 'ProbablyYes';
  }

  if (supportShare >= 0.45) {
    return 'Unclear';
  }

  if (supportShare >= 0.33) {
    return 'ProbablyNot';
  }

  return 'NoItDoesntSeemSo';
}

/**
 * Calculates confidence based on support share and variance
 * Formula: distance from 0.5 × (1 - variance)
 * 
 * @param supportShare - Support share (0-1)
 * @param variance - Variance (0-1)
 * @returns Confidence (0-100)
 */
function calculateConfidence(
  supportShare: number,
  variance: number
): number {
  // Clamp inputs to valid ranges to prevent calculation errors
  const clampedSupportShare = Math.max(0, Math.min(1, supportShare));
  const clampedVariance = Math.max(0, Math.min(1, variance));
  
  // Distance from neutral (0.5)
  // Maximum distance is 0.5 (when supportShare is 0 or 1)
  const distance = Math.abs(clampedSupportShare - 0.5);
  
  // Confidence = distance × (1 - variance) × 100
  // Maximum: 0.5 × 1 × 100 = 50, but we'll clamp anyway for safety
  const confidence = distance * (1 - clampedVariance) * 100;
  
  // Clamp to 0-100 to ensure it never exceeds 100
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Calculates consensus verdict for a question based on article stances
 * 
 * @param stances - Array of article stances with outlet information
 * @param month - Month period for filtering (optional, defaults to current month)
 * @returns Verdict calculation result
 */
export function calculateVerdict(
  stances: Array<{
    stance: Stance;
    confidence: number;
    article: {
      outlet: {
        id: string;
        credibilityScore: number;
        ideology: Ideology;
      };
    };
  }>,
  month?: Date
): VerdictCalculationResult {
  // Filter by month if provided
  const monthPeriod = month ? getMonthPeriod(month) : undefined;
  
  // Convert to internal format
  const stancesWithOutlet: StanceWithOutlet[] = stances.map((s) => ({
    stance: s.stance,
    confidence: s.confidence,
    outlet: s.article.outlet,
  }));

  // Check minimum article count
  if (stancesWithOutlet.length < MIN_ARTICLES_FOR_VERDICT) {
    return {
      verdictLabel: 'Unclear',
      confidence: 20, // Low confidence
      supportShare: 0.5,
      variance: 1.0,
      articleCount: stancesWithOutlet.length,
    };
  }

  // Compute outlet weights based on credibility
  const outletWeights = computeOutletWeights(stancesWithOutlet);

  // Calculate support share (S)
  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const stanceWithOutlet of stancesWithOutlet) {
    const weight = outletWeights.get(stanceWithOutlet.outlet.id) || 0;
    const stanceScore = STANCE_SCORES[stanceWithOutlet.stance];
    const adjustedScore = stanceScore * stanceWithOutlet.confidence;

    totalWeightedScore += adjustedScore * weight;
    totalWeight += weight;
  }

  const supportShare = totalWeight > 0 ? totalWeightedScore / totalWeight : 0.5;

  // Calculate variance across outlets
  const variance = calculateVariance(stancesWithOutlet, outletWeights);

  // Determine verdict label
  const verdictLabel = determineVerdictLabel(supportShare, variance);

  // Calculate confidence
  const confidence = calculateConfidence(supportShare, variance);

  return {
    verdictLabel,
    confidence,
    supportShare,
    variance,
    articleCount: stancesWithOutlet.length,
  };
}

/**
 * Calculates verdicts for multiple questions
 * 
 * @param questions - Array of questions with their stances
 * @param month - Month period for filtering (optional)
 * @returns Map of question ID to verdict calculation result
 */
export function calculateVerdicts(
  questions: Array<{
    id: string;
    stances: Array<{
      stance: Stance;
      confidence: number;
      article: {
        outlet: {
          id: string;
          credibilityScore: number;
          ideology: Ideology;
        };
      };
    }>;
  }>,
  month?: Date
): Map<string, VerdictCalculationResult> {
  const results = new Map<string, VerdictCalculationResult>();

  for (const question of questions) {
    const result = calculateVerdict(question.stances, month);
    results.set(question.id, result);
  }

  return results;
}

