import {
  findQuestionById,
  findArticleStancesByQuestionId,
} from '@acta/db';
import { getCurrentMonthPeriod, parseMonthPeriod } from '@acta/core';
import type { ConsensusThermometerDTO, OutletStanceDTO, Stance } from '@acta/shared';

/**
 * Get consensus thermometer data for a question
 */
export async function getConsensusThermometer(
  questionId: string,
  month?: string
): Promise<ConsensusThermometerDTO | null> {
  const question = await findQuestionById(questionId);
  if (!question) return null;

  const monthDate = month
    ? parseMonthPeriod(month)
    : getCurrentMonthPeriod();

  // Get all article stances for this question
  const stances = await findArticleStancesByQuestionId(questionId);

  // Filter stances by month (from articleAnalysisAttempt)
  const monthStances = stances.filter((stance) => {
    const attempt = (stance as any).articleAnalysisAttempt;
    if (!attempt) return false;
    const attemptMonth = new Date(attempt.month);
    return (
      attemptMonth.getFullYear() === monthDate.getFullYear() &&
      attemptMonth.getMonth() === monthDate.getMonth()
    );
  });

  // Transform to outlet stances
  const outletStancesMap = new Map<string, OutletStanceDTO>();

  for (const stance of monthStances) {
    const article = (stance as any).article;
    const outlet = article?.outlet;
    const attempt = (stance as any).articleAnalysisAttempt;

    if (!outlet || !attempt) continue;

    const outletId = outlet.id;
    const credibilityScore = outlet.credibilityScore;
    const weightedContribution = credibilityScore; // Simple weighting

    // Use existing or create new outlet stance
    if (!outletStancesMap.has(outletId)) {
      outletStancesMap.set(outletId, {
        outletId: outlet.id,
        outletName: outlet.name,
        credibilityScore,
        stance: attempt.stance as Stance,
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        reasoning: attempt.reasoning,
        weightedContribution,
      });
    }
  }

  const outletStances = Array.from(outletStancesMap.values());

  // Calculate stance summary
  const stanceMap = new Map<Stance, { count: number; weightedSupport: number }>();

  for (const outletStance of outletStances) {
    const existing = stanceMap.get(outletStance.stance) || {
      count: 0,
      weightedSupport: 0,
    };
    stanceMap.set(outletStance.stance, {
      count: existing.count + 1,
      weightedSupport: existing.weightedSupport + outletStance.weightedContribution,
    });
  }

  // Normalize weighted support to 0-1 range
  const totalWeighted = Array.from(stanceMap.values()).reduce(
    (sum, s) => sum + s.weightedSupport,
    0
  );

  const stanceSummary = Array.from(stanceMap.entries()).map(([stance, data]) => ({
    stance,
    outletCount: data.count,
    weightedSupport: totalWeighted > 0 ? data.weightedSupport / totalWeighted : 0,
  }));

  return {
    questionId: question.id,
    questionText: question.questionText,
    month: monthDate.toISOString(),
    outletStances,
    stanceSummary,
  };
}

