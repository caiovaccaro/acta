import {
  findActiveQuestions,
  findQuestionById,
  findQuestionRedirect,
} from '@acta/db';
import {
  findVerdictByQuestionAndMonth,
  findLatestVerdictByQuestion,
} from '@acta/db';
import { findArticleStancesByQuestionId } from '@acta/db';
import { getCurrentMonthPeriod } from '@acta/core';
import type { QuestionCardDTO } from '@acta/shared';

function isConsensusLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return label !== 'Unclear';
}

function isUnclearLabel(label: string | null | undefined): boolean {
  return label === 'Unclear';
}

interface QuestionWithMetrics extends QuestionCardDTO {
  journalistCount: number;
  publicationCount: number;
}

async function buildQuestionCardDTO(
  question: any
): Promise<QuestionWithMetrics | null> {
  const currentMonth = getCurrentMonthPeriod();

  let verdict = await findVerdictByQuestionAndMonth(
    question.id,
    currentMonth
  );
  if (!verdict) {
    verdict = await findLatestVerdictByQuestion(question.id);
  }

  const articleStances = await findArticleStancesByQuestionId(question.id);
  if (articleStances.length === 0) {
    return null;
  }

  const outletMap = new Map<string, { id: string; name: string }>();

  articleStances.forEach((stance: any) => {
    if (stance.article?.outlet) {
      const outlet = stance.article.outlet;
      if (!outletMap.has(outlet.id)) {
        outletMap.set(outlet.id, {
          id: outlet.id,
          name: outlet.name,
        });
      }
    }
  });

  const outlets = Array.from(outletMap.values());

  const articleIds = new Set(articleStances.map((s) => s.articleId));
  const journalistCount = articleIds.size;
  const publicationCount = outlets.length;

  return {
    id: question.id,
    questionText: question.questionText,
    isActive: question.isActive,
    topicId: question.topicId,
    topicName: (question as any).topic?.name || 'Unknown',
    isFeatured: (question as any).isFeatured ?? false,
    featuredOrder: (question as any).featuredOrder ?? null,
    verdict: verdict
      ? {
          id: verdict.id,
          verdictLabel: verdict.verdictLabel as any,
          confidence: verdict.confidence,
          month: verdict.month.toISOString(),
        }
      : null,
    outlets,
    contextBlurb: (question as any).contextBlurb ?? null,
    journalistCount,
    publicationCount,
  };
}

/**
 * Get all active questions with their topics and verdicts for card display
 */
export async function getAllQuestions(options?: {
  featuredOnly?: boolean;
  bucket?: 'consensus' | 'under-debate' | 'all';
}): Promise<QuestionCardDTO[]> {
  const questions = await findActiveQuestions();

  const questionsWithData = await Promise.all(
    questions.map((question) => buildQuestionCardDTO(question))
  );

  let filtered = questionsWithData.filter(
    (q) =>
      q !== null &&
      q.journalistCount >= 3 &&
      q.publicationCount >= 2
  ) as QuestionWithMetrics[];

  const bucket = options?.bucket ?? 'all';
  if (bucket === 'consensus') {
    filtered = filtered.filter((q) => isConsensusLabel(q.verdict?.verdictLabel));
  } else if (bucket === 'under-debate') {
    filtered = filtered.filter((q) => isUnclearLabel(q.verdict?.verdictLabel));
  }

  let result: QuestionCardDTO[] = filtered;

  if (options?.featuredOnly) {
    result = filtered
      .filter((q) => (q as any).isFeatured)
      .sort((a, b) => {
        const orderA = (a as any).featuredOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = (b as any).featuredOrder ?? Number.MAX_SAFE_INTEGER;
        return orderA - orderB;
      });
  }

  return result;
}

/**
 * Get a question by ID with its topic and verdict
 */
export async function getQuestionById(id: string): Promise<QuestionCardDTO | null> {
  const question = await findQuestionById(id);
  if (!question) return null;

  const currentMonth = getCurrentMonthPeriod();
  let verdict = await findVerdictByQuestionAndMonth(question.id, currentMonth);
  // Fall back to latest verdict if current month doesn't have one
  if (!verdict) {
    verdict = await findLatestVerdictByQuestion(question.id);
  }

  // Get unique outlets from article stances
  const articleStances = await findArticleStancesByQuestionId(question.id);
  const outletMap = new Map<string, { id: string; name: string }>();
  
  articleStances.forEach((stance: any) => {
    if (stance.article?.outlet) {
      const outlet = stance.article.outlet;
      if (!outletMap.has(outlet.id)) {
        outletMap.set(outlet.id, {
          id: outlet.id,
          name: outlet.name,
        });
      }
    }
  });

  const outlets = Array.from(outletMap.values());

  return {
    id: question.id,
    questionText: question.questionText,
    isActive: question.isActive,
    topicId: question.topicId,
    topicName: (question as any).topic?.name || 'Unknown',
    isFeatured: (question as any).isFeatured ?? false,
    featuredOrder: (question as any).featuredOrder ?? null,
    verdict: verdict
      ? {
          id: verdict.id,
          verdictLabel: verdict.verdictLabel as any,
          confidence: verdict.confidence,
          month: verdict.month.toISOString(),
        }
      : null,
    outlets,
  };
}

/**
 * Find a question redirect by old question ID
 * Re-exported from @acta/db for convenience
 */
export { findQuestionRedirect } from '@acta/db';

