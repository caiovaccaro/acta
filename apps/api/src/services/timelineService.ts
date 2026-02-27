import {
  findQuestionById,
  findTopicById,
  findArticleStancesByQuestionId,
  findTopicArticlesByTopicId,
  findTimelineEventsByTopicOrQuestion,
  createTimelineEvents,
} from '@acta/db';
import { getLLMProvider } from '../utils/llmProvider';
import type { TimelineEventDTO } from '@acta/shared';

const timelineGenerationLocks = new Map<string, Promise<void>>();

async function withTimelineGenerationLock(
  key: string,
  task: () => Promise<void>
): Promise<void> {
  const running = timelineGenerationLocks.get(key);
  if (running) {
    await running;
    return;
  }

  const promise = (async () => {
    try {
      await task();
    } finally {
      timelineGenerationLocks.delete(key);
    }
  })();

  timelineGenerationLocks.set(key, promise);
  await promise;
}

/**
 * Fetch timeline events from database
 */
export async function getTimelineEvents(
  topicId?: string,
  questionId?: string,
  lazyGenerate: boolean = false
): Promise<TimelineEventDTO[]> {
  if (lazyGenerate && (topicId || questionId)) {
    const key = topicId ? `topic:${topicId}` : `question:${questionId}`;
    try {
      await withTimelineGenerationLock(key, async () => {
        const existing = await findTimelineEventsByTopicOrQuestion(topicId, questionId);
        if (existing.length > 0) return;

        const generated = await generateTimelineEvents(topicId, questionId);
        if (generated.length === 0) return;

        const rows = generated.map((e, idx) => ({
          topicId: topicId || null,
          questionId: questionId || null,
          date: new Date(e.date),
          title: e.title,
          description: e.description,
          order: idx,
        }));

        await createTimelineEvents(rows);
      });
    } catch (error) {
      console.warn(
        `[timelineService] Lazy timeline generation failed for ${key}:`,
        error
      );
    }
  }

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
 * NOTE: Timeline events should be pre-generated via db:generate:timeline-events
 * This function is available as fallback but should rarely be needed
 */
export async function generateTimelineEvents(
  topicId?: string,
  questionId?: string
): Promise<TimelineEventDTO[]> {
  // Check for existing events first
  const existing = await getTimelineEvents(topicId, questionId);
  if (existing.length > 0) return existing;
  
  // Warn that content should be pre-generated
  console.warn(`[timelineService] Timeline events not pre-generated for ${questionId || topicId}. Generating on-demand. Run db:generate:timeline-events to pre-generate.`);

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


