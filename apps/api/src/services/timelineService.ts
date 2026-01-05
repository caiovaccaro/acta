import {
  findQuestionById,
  findTopicById,
  findArticleStancesByQuestionId,
  findTopicArticlesByTopicId,
  findTimelineEventsByTopicOrQuestion,
} from '@acta/db';
import { getLLMProvider } from '../utils/llmProvider';
import type { TimelineEventDTO } from '@acta/shared';

/**
 * Fetch timeline events from database
 */
export async function getTimelineEvents(
  topicId?: string,
  questionId?: string
): Promise<TimelineEventDTO[]> {
  const events = await findTimelineEventsByTopicOrQuestion(topicId, questionId);
  return events.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    title: e.title,
    description: e.description,
    verdictLabel: null as any,
  }));
}

/**
 * Generate timeline events using LLM from article content
 */
export async function generateTimelineEvents(
  topicId?: string,
  questionId?: string
): Promise<TimelineEventDTO[]> {
  // Check for existing events first
  const existing = await getTimelineEvents(topicId, questionId);
  if (existing.length > 0) return existing;

  // Get articles for LLM generation
  let articles: Array<{
    id: string;
    title: string;
    textContent: string;
    publishedDate: Date | null;
    outletName: string;
  }> = [];

  if (questionId) {
    const question = await findQuestionById(questionId);
    if (!question) return [];

    const stances = await findArticleStancesByQuestionId(questionId);
    articles = stances.slice(0, 20).map((stance) => {
      const article = (stance as any).article;
      const outlet = article?.outlet;
      return {
        id: article.id,
        title: article.title,
        textContent: article.textContent,
        publishedDate: article.publishedDate,
        outletName: outlet?.name || 'Unknown',
      };
    });
  } else if (topicId) {
    const topic = await findTopicById(topicId);
    if (!topic) return [];

    const topicArticles = await findTopicArticlesByTopicId(topicId);
    articles = topicArticles.slice(0, 20).map((ta) => {
      const article = (ta as any).article;
      const outlet = article?.outlet;
      return {
        id: article.id,
        title: article.title,
        textContent: article.textContent,
        publishedDate: article.publishedDate,
        outletName: outlet?.name || 'Unknown',
      };
    });
  }

  if (articles.length === 0) return [];

  // Generate timeline using LLM
  try {
    const llmProvider = getLLMProvider();
    const question = questionId ? await findQuestionById(questionId) : null;
    const topic = topicId ? await findTopicById(topicId) : null;

    const result = await llmProvider.generateTimelineEvents({
      question: {
        text: question?.questionText || topic?.name || 'Unknown',
        topicName: topic?.name || 'Unknown',
      },
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        textContent: a.textContent,
        publishedDate: a.publishedDate?.toISOString() || null,
        outletName: a.outletName,
      })),
    });

    // Convert to TimelineEventDTO format
    return result.events.map((e, idx) => ({
      id: `generated-${idx}`,
      date: e.date,
      title: e.title,
      description: e.description,
      verdictLabel: null as any,
    }));
  } catch (error) {
    console.warn('LLM not available for timeline generation:', error);
    return [];
  }
}


