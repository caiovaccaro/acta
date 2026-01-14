import { findActiveQuestions, findQuestionById, findQuestionRedirect } from '@acta/db';
import { findVerdictByQuestionAndMonth, findLatestVerdictByQuestion } from '@acta/db';
import { findArticleStancesByQuestionId } from '@acta/db';
import { getCurrentMonthPeriod } from '@acta/core';
import type { QuestionCardDTO } from '@acta/shared';

/**
 * Get all active questions with their topics and verdicts for card display
 */
export async function getAllQuestions(): Promise<QuestionCardDTO[]> {
  const questions = await findActiveQuestions();

  const currentMonth = getCurrentMonthPeriod();

  const questionsWithData = await Promise.all(
    questions.map(async (question) => {
      let verdict = await findVerdictByQuestionAndMonth(
        question.id,
        currentMonth
      );
      // Fall back to latest verdict if current month doesn't have one
      if (!verdict) {
        verdict = await findLatestVerdictByQuestion(question.id);
      }

      // Get unique outlets from article stances
      const articleStances = await findArticleStancesByQuestionId(question.id);
      
      // Filter out questions with no articles
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
      
      // Calculate journalist count and publication count
      const articleIds = new Set(articleStances.map((s) => s.articleId));
      const journalistCount = articleIds.size; // Using article count as proxy
      const publicationCount = outlets.length;

      return {
        id: question.id,
        questionText: question.questionText,
        isActive: question.isActive,
        topicId: question.topicId,
        topicName: (question as any).topic?.name || 'Unknown',
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
    })
  );

  // Filter out null values (questions with no articles)
  return questionsWithData.filter((q) => q !== null) as QuestionCardDTO[];
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

