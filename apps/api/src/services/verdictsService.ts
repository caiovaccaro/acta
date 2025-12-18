import {
  findVerdictByQuestionAndMonth,
  findVerdictsByQuestion,
  findQuestionById,
  findEvidenceBulletsByVerdictId,
  findArticleStancesByQuestionId,
} from '@acta/db';
import { getCurrentMonthPeriod, parseMonthPeriod } from '@acta/core';
import type { VerdictCardDTO, VerdictDTO } from '@acta/shared';

/**
 * Get verdict card for a question and month
 */
export async function getVerdictCard(
  questionId: string,
  month?: string
): Promise<VerdictCardDTO | null> {
  const question = await findQuestionById(questionId);
  if (!question) return null;

  const monthDate = month
    ? parseMonthPeriod(month)
    : getCurrentMonthPeriod();

  const verdict = await findVerdictByQuestionAndMonth(questionId, monthDate);
  if (!verdict) return null;

  // Get evidence bullets
  const evidenceBullets = await findEvidenceBulletsByVerdictId(verdict.id);

  // Get article stances to calculate counts
  const stances = await findArticleStancesByQuestionId(questionId);
  const articleIds = new Set(stances.map((s) => s.articleId));
  const articleCount = articleIds.size;

  // Get unique outlets from stances (which include article with outlet)
  const outlets = new Set(
    stances
      .map((s) => (s as any).article?.outlet?.id)
      .filter((id): id is string => id !== undefined)
  );
  const outletCount = outlets.size;

  // Get month start and end
  const monthStart = new Date(monthDate);
  const monthEnd = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // Get safety note if needed
  const topic = (verdict as any).question?.topic;
  const safetyNote = topic?.safetyNoteRequired
    ? getSafetyNote(topic.name)
    : null;

  return {
    id: verdict.id,
    questionId: question.id,
    questionText: question.questionText,
    topicId: topic?.id || question.topicId,
    topicName: topic?.name || 'Unknown',
    month: verdict.month.toISOString(),
    verdictLabel: verdict.verdictLabel as any,
    confidence: verdict.confidence,
    supportShare: verdict.supportShare,
    variance: verdict.variance,
    reasoning: verdict.reasoning,
    articleCount,
    outletCount,
    calculatedAt: verdict.calculatedAt.toISOString(),
    evidenceBullets: evidenceBullets.map((eb) => ({
      id: eb.id,
      text: eb.text,
      type: eb.type as 'Why' | 'Dissent' | 'Unknowns',
      articleId: eb.articleId,
      articleTitle: (eb as any).article?.title || null,
      articleUrl: (eb as any).article?.url || null,
      outletName: (eb as any).article?.outlet?.name || null,
      order: eb.order,
    })),
    scopeNote: {
      articleCount,
      outletCount,
      dateRange: {
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
      },
    },
    safetyNote: safetyNote || undefined,
  };
}

/**
 * Get verdict history for a question
 */
export async function getVerdictHistory(
  questionId: string,
  limit: number = 12
): Promise<VerdictDTO[]> {
  const question = await findQuestionById(questionId);
  if (!question) return [];

  const verdicts = await findVerdictsByQuestion(questionId);
  const limited = verdicts.slice(0, limit);

  const stances = await findArticleStancesByQuestionId(questionId);
  const articleIds = new Set(stances.map((s) => s.articleId));
  const articleCount = articleIds.size;

  // Get unique outlets from stances (which include article with outlet)
  const outlets = new Set(
    stances
      .map((s) => (s as any).article?.outlet?.id)
      .filter((id): id is string => id !== undefined)
  );
  const outletCount = outlets.size;

  return limited.map((verdict) => ({
    id: verdict.id,
    questionId: verdict.questionId,
    questionText: question.questionText,
    topicId: question.topicId,
    topicName: (verdict as any).question?.topic?.name || 'Unknown',
    month: verdict.month.toISOString(),
    verdictLabel: verdict.verdictLabel as any,
    confidence: verdict.confidence,
    supportShare: verdict.supportShare,
    variance: verdict.variance,
    reasoning: verdict.reasoning,
    articleCount,
    outletCount,
    calculatedAt: verdict.calculatedAt.toISOString(),
  }));
}

/**
 * Get current verdict for a question
 */
export async function getCurrentVerdict(
  questionId: string
): Promise<VerdictCardDTO | null> {
  return getVerdictCard(questionId);
}

/**
 * Get safety note for a topic
 */
function getSafetyNote(topicName: string): string {
  if (topicName.toLowerCase().includes('gaza')) {
    return 'This topic addresses sensitive geopolitical issues. Our analysis is based on factual reporting from credible sources and does not endorse any form of hate speech, antisemitism, or Islamophobia.';
  }
  return '';
}

