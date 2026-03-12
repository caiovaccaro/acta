import {
  findQuestionById,
  findArticleStancesByQuestionId,
  findVerdictByQuestionAndMonth,
  findLatestVerdictByQuestion,
} from '@acta/db';
import { getCurrentMonthPeriod, parseMonthPeriod } from '@acta/core';
import type {
  ConsensusThermometerDTO,
  OutletStanceDTO,
  Stance,
  CountryOpinionDTO,
} from '@acta/shared';

/**
 * Get consensus thermometer data for a question
 */
export async function getConsensusThermometer(
  questionId: string,
  month?: string
): Promise<ConsensusThermometerDTO | null> {
  const question = await findQuestionById(questionId);
  if (!question) return null;

  let monthDate = month
    ? parseMonthPeriod(month)
    : getCurrentMonthPeriod();

  // Get the verdict to calculate alignment
  const verdict = await findVerdictByQuestionAndMonth(questionId, monthDate);
  const currentVerdict = verdict || await findLatestVerdictByQuestion(questionId);
  // Keep month filtering aligned with whichever verdict is actually used.
  if (!verdict && currentVerdict) {
    monthDate = currentVerdict.month;
  }

  // Get all article stances for this question
  const stances = await findArticleStancesByQuestionId(questionId);

  // Filter stances by the final month (after verdict fallback)
  const monthStances = stances.filter((stance) => {
    const attempt = (stance as any).articleAnalysisAttempt;
    if (!attempt) return false;
    const attemptMonth = new Date(attempt.month);
    return (
      attemptMonth.getFullYear() === monthDate.getFullYear() &&
      attemptMonth.getMonth() === monthDate.getMonth()
    );
  });
  
  // Stance to numeric score mapping (for alignment calculation)
  const STANCE_SCORES: Record<Stance, number> = {
    YesItSeemsSo: 1.0,
    ProbablyYes: 0.75,
    Unclear: 0.5,
    ProbablyNot: 0.25,
    NoItDoesntSeemSo: 0.0,
  };
  
  // Calculate verdict score if available
  let verdictScore = 0.5; // Default to 0.5 (Unclear) if no verdict
  if (currentVerdict) {
    const verdictLabel = currentVerdict.verdictLabel;
    if (verdictLabel === 'YesItSeemsSo' || verdictLabel === 'ProbablyYes') {
      verdictScore = verdictLabel === 'YesItSeemsSo' ? 1.0 : 0.75;
    } else if (verdictLabel === 'NoItDoesntSeemSo' || verdictLabel === 'ProbablyNot') {
      verdictScore = verdictLabel === 'NoItDoesntSeemSo' ? 0.0 : 0.25;
    } else {
      verdictScore = 0.5; // Unclear
    }
  }
  
  // Debug logging
  console.log(`[consensusService] Question: ${questionId}, Month: ${monthDate.toISOString()}`);
  console.log(`[consensusService] Verdict: ${currentVerdict?.verdictLabel || 'none'}, VerdictScore: ${verdictScore}`);
  console.log(`[consensusService] Month stances count: ${monthStances.length}`);

  // Transform to outlet stances
  const outletStancesMap = new Map<string, OutletStanceDTO>();

  for (const stance of monthStances) {
    const article = (stance as any).article;
    const outlet = article?.outlet;
    const attempt = (stance as any).articleAnalysisAttempt;

    if (!outlet || !attempt) continue;

    const outletId = outlet.id;
    const credibilityScore = outlet.credibilityScore;
    const outletStance = attempt.stance as Stance;
    // Use ?? instead of || because 0.0 is a valid score (for NoItDoesntSeemSo)
    // || would treat 0.0 as falsy and default to 0.5
    const outletStanceScore = STANCE_SCORES[outletStance] ?? 0.5;
    
    // Calculate alignment: how close is the outlet's stance to the verdict?
    // Alignment = 1 - |verdictScore - outletStanceScore|
    // This gives 1.0 for perfect match, 0.0 for opposite
    // Examples:
    // - Verdict: YesItSeemsSo (1.0), Outlet: YesItSeemsSo (1.0) → alignment = 1.0 (100%)
    // - Verdict: YesItSeemsSo (1.0), Outlet: ProbablyYes (0.75) → alignment = 0.75 (75%)
    // - Verdict: YesItSeemsSo (1.0), Outlet: Unclear (0.5) → alignment = 0.5 (50%)
    // - Verdict: YesItSeemsSo (1.0), Outlet: NoItDoesntSeemSo (0.0) → alignment = 0.0 (0%)
    const alignment = 1 - Math.abs(verdictScore - outletStanceScore);
    
    // Debug logging for first few outlets
    if (outletStancesMap.size < 3) {
      console.log(`[consensusService] Outlet: ${outlet.name}, Stance: ${outletStance} (${outletStanceScore}), Alignment: ${(alignment * 100).toFixed(0)}%`);
    }
    
    // weightedContribution represents the alignment percentage (0-1)
    // This is displayed as "X% alignment" in the UI
    // Credibility is separate metadata, not used for alignment display
    const weightedContribution = alignment;

    // Use existing or create new outlet stance
    if (!outletStancesMap.has(outletId)) {
      outletStancesMap.set(outletId, {
        outletId: outlet.id,
        outletName: outlet.name,
        credibilityScore,
        stance: outletStance,
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

/**
 * Aggregate stances by outlet country for a world map view.
 */
export async function getQuestionCountryStances(
  questionId: string,
  month?: string
): Promise<CountryOpinionDTO[]> {
  const question = await findQuestionById(questionId);
  if (!question) return [];

  let monthDate = month
    ? parseMonthPeriod(month)
    : getCurrentMonthPeriod();

  const verdict = await findVerdictByQuestionAndMonth(questionId, monthDate);
  const currentVerdict = verdict || await findLatestVerdictByQuestion(questionId);
  if (!verdict && currentVerdict) {
    monthDate = currentVerdict.month;
  }

  const stances = await findArticleStancesByQuestionId(questionId);

  const monthStances = stances.filter((stance) => {
    const attempt = (stance as any).articleAnalysisAttempt;
    if (!attempt) return false;
    const attemptMonth = new Date(attempt.month);
    return (
      attemptMonth.getFullYear() === monthDate.getFullYear() &&
      attemptMonth.getMonth() === monthDate.getMonth()
    );
  });

  // Use month-filtered stances when available; otherwise use all stances so the map still shows data
  const stancesToUse = monthStances.length > 0 ? monthStances : stances;

  const countryMap = new Map<
    string,
    {
      articleIds: Set<string>;
      outletIds: Set<string>;
      stanceCounts: Record<Stance, number>;
      outletStanceCounts: Map<
        string,
        {
          outletName: string;
          stanceCounts: Record<Stance, number>;
        }
      >;
    }
  >();

  for (const stance of stancesToUse) {
    const article = (stance as any).article;
    const outlet = article?.outlet;
    const attempt = (stance as any).articleAnalysisAttempt;
    if (!outlet || !attempt) continue;

    const countryCode = outlet.countryCode;
    if (!countryCode) continue;

    const stanceLabel = attempt.stance as Stance;

    let entry = countryMap.get(countryCode);
    if (!entry) {
      entry = {
        articleIds: new Set<string>(),
        outletIds: new Set<string>(),
        stanceCounts: {
          YesItSeemsSo: 0,
          ProbablyYes: 0,
          Unclear: 0,
          ProbablyNot: 0,
          NoItDoesntSeemSo: 0,
        },
        outletStanceCounts: new Map(),
      };
      countryMap.set(countryCode, entry);
    }

    entry.articleIds.add(article.id);
    entry.outletIds.add(outlet.id);
    entry.stanceCounts[stanceLabel] += 1;

    const outletKey = outlet.id;
    let outletEntry = entry.outletStanceCounts.get(outletKey);
    if (!outletEntry) {
      outletEntry = {
        outletName: outlet.name,
        stanceCounts: {
          YesItSeemsSo: 0,
          ProbablyYes: 0,
          Unclear: 0,
          ProbablyNot: 0,
          NoItDoesntSeemSo: 0,
        },
      };
      entry.outletStanceCounts.set(outletKey, outletEntry);
    }
    outletEntry.stanceCounts[stanceLabel] += 1;
  }

  const results: CountryOpinionDTO[] = [];

  for (const [countryCode, data] of Array.from(countryMap.entries())) {
    const articleCount = data.articleIds.size;
    const outletCount = data.outletIds.size;

    // Determine dominant stance
    let dominant: Stance = 'Unclear';
    let maxCount = -1;
    let total = 0;

    (Object.keys(data.stanceCounts) as Stance[]).forEach((stanceLabel) => {
      const count = data.stanceCounts[stanceLabel];
      total += count;
      if (count > maxCount) {
        maxCount = count;
        dominant = stanceLabel;
      }
    });

    if (total === 0) continue;

    const dominanceRatio = maxCount > 0 ? maxCount / total : 0;

    // Require at least one article and one outlet per country to show on the map
    if (articleCount < 1 || outletCount < 1) continue;

    // Require at least simple plurality; if too balanced, mark as Unclear
    if (maxCount / total < 0.4) {
      dominant = 'Unclear';
    }

    // Build per-outlet summaries for this country (for tooltips on the map)
    const outlets = Array.from(data.outletStanceCounts.values()).map((outletEntry) => {
      let outletDominant: Stance = 'Unclear';
      let outletMax = -1;
      let outletTotal = 0;
      (Object.keys(outletEntry.stanceCounts) as Stance[]).forEach((stanceLabel) => {
        const c = outletEntry.stanceCounts[stanceLabel];
        outletTotal += c;
        if (c > outletMax) {
          outletMax = c;
          outletDominant = stanceLabel;
        }
      });
      if (outletTotal === 0) {
        outletDominant = 'Unclear';
      }
      return {
        outletName: outletEntry.outletName,
        stance: outletDominant,
        articleCount: outletTotal,
      };
    }).sort((a, b) => b.articleCount - a.articleCount);

    results.push({
      countryCode,
      dominantStance: dominant,
      articleCount,
      outletCount,
      dominanceRatio,
      outlets,
    });
  }

  return results;
}

