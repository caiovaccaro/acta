import {
  findQuestionById,
  findArticleStancesByQuestionId,
} from '@acta/db';
import { getCurrentMonthPeriod, parseMonthPeriod } from '@acta/core';
import type { DebateCardDTO, ArgumentDTO, UnknownDTO, SourceCitationDTO } from '@acta/shared';

/**
 * Get debate card data for a question
 */
export async function getDebateCard(
  questionId: string,
  month?: string
): Promise<DebateCardDTO | null> {
  const question = await findQuestionById(questionId);
  if (!question) return null;

  const monthDate = month
    ? parseMonthPeriod(month)
    : getCurrentMonthPeriod();

  // Get all article stances for this question
  const stances = await findArticleStancesByQuestionId(questionId);

  // Filter stances by month
  const monthStances = stances.filter((stance) => {
    const attempt = (stance as any).articleAnalysisAttempt;
    if (!attempt) return false;
    const attemptMonth = new Date(attempt.month);
    return (
      attemptMonth.getFullYear() === monthDate.getFullYear() &&
      attemptMonth.getMonth() === monthDate.getMonth()
    );
  });

  // Extract arguments (from reasoning)
  const argumentsFor: ArgumentDTO[] = [];
  const argumentsAgainst: ArgumentDTO[] = [];
  const sources: SourceCitationDTO[] = [];

  for (const stance of monthStances) {
    const article = (stance as any).article;
    const outlet = article?.outlet;
    const attempt = (stance as any).articleAnalysisAttempt;

    if (!attempt || !outlet) continue;

    // Add to sources
    sources.push({
      articleId: article.id,
      articleTitle: article.title,
      articleUrl: article.url,
      outletName: outlet.name,
      publishedDate: article.publishedDate?.toISOString() || null,
    });

    // Extract arguments from reasoning
    if (attempt.reasoning) {
      const argument: ArgumentDTO = {
        id: `${article.id}-${attempt.id}`,
        text: attempt.reasoning,
        articleId: article.id,
        articleTitle: article.title,
        articleUrl: article.url,
        outletName: outlet.name,
      };

      // Categorize by stance
      if (
        attempt.stance === 'YesItSeemsSo' ||
        attempt.stance === 'ProbablyYes'
      ) {
        argumentsFor.push(argument);
      } else if (
        attempt.stance === 'NoItDoesntSeemSo' ||
        attempt.stance === 'ProbablyNot'
      ) {
        argumentsAgainst.push(argument);
      }
    }
  }

  // Sort and limit to top 3
  const topArgumentsFor = argumentsFor.slice(0, 3);
  const topArgumentsAgainst = argumentsAgainst.slice(0, 3);

  // Generate overview from verdict reasoning if available
  const topic = (question as any).topic;
  const topicName = topic?.name || 'this topic';
  const overview = `This question addresses ${topicName}. The analysis considers multiple perspectives from credible news sources to provide a balanced view of the current state of the debate.`;

  // Unknowns - could be extracted from evidence bullets or generated
  const unknowns: UnknownDTO[] = [
    {
      id: 'unknown-1',
      text: 'Additional data may be needed to fully assess this question.',
      articleId: null,
    },
  ];

  return {
    questionId: question.id,
    questionText: question.questionText,
    topicId: question.topicId,
    topicName: topic?.name || 'Unknown',
    overview,
    argumentsFor: topArgumentsFor,
    argumentsAgainst: topArgumentsAgainst,
    unknowns,
    sources: sources.slice(0, 20), // Limit to 20 sources
  };
}

