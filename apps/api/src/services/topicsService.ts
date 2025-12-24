import {
  findAllTopics,
  findTopicById,
  findQuestionsByTopicId,
  findArticleStancesByQuestionId,
} from '@acta/db';
import { findVerdictByQuestionAndMonth } from '@acta/db';
import { getCurrentMonthPeriod } from '@acta/core';
import type {
  TopicDTO,
  TopicDetailDTO,
  QuestionSummaryDTO,
  VerdictCardDTO,
  QuestionCardDTO,
} from '@acta/shared';

/**
 * Get all topics
 */
export async function getAllTopics(
  includeInactive: boolean = false
): Promise<TopicDTO[]> {
  const topics = await findAllTopics(!includeInactive);

  const topicsWithData = await Promise.all(
    topics.map(async (topic) => {
      const questions = await findQuestionsByTopicId(topic.id, false);
      const activeQuestions = questions.filter((q) => q.isActive);
      
      // Skip topics with no active questions
      if (activeQuestions.length === 0) {
        return null;
      }

      // Filter out questions without articles (likely AI-generated placeholders)
      // Check which questions have articles
      const questionsWithArticles = await Promise.all(
        activeQuestions.map(async (q) => {
          const stances = await findArticleStancesByQuestionId(q.id);
          return { question: q, hasArticles: stances.length > 0 };
        })
      );
      
      // Only include questions that have articles
      const realQuestions = questionsWithArticles
        .filter(({ hasArticles }) => hasArticles)
        .map(({ question }) => question);

      // If no real questions, skip this topic
      if (realQuestions.length === 0) {
        return null;
      }

      // Determine main question:
      // 1) Admin override via mainQuestionId (must be a real question)
      // 2) Fallback to question with highest article + outlet count (from real questions)
      let mainQuestion = realQuestions[0] || null;
      const topicWithOverride = topic as any;
      if (topicWithOverride.mainQuestionId) {
        const override = realQuestions.find(
          (q) => q.id === topicWithOverride.mainQuestionId
        );
        if (override) {
          mainQuestion = override;
        }
      }

      if (!mainQuestion && realQuestions.length > 0) {
        // Compute counts for each question and pick the one with highest
        let best = realQuestions[0];
        let bestScore = -1;
        for (const q of realQuestions) {
          const stances = await findArticleStancesByQuestionId(q.id);
          const articleIds = new Set(stances.map((s) => s.articleId));
          const outletIds = new Set(
            stances
              .map((s) => (s as any).article?.outletId as string | undefined)
              .filter((id): id is string => !!id)
          );
          const score = articleIds.size + outletIds.size;
          if (score > bestScore) {
            bestScore = score;
            best = q;
          }
        }
        mainQuestion = best;
      }

      let firstQuestionSummary: QuestionSummaryDTO | null = null;
      let firstQuestionOutlets: Array<{ id: string; name: string }> = [];

      if (mainQuestion) {
        const currentMonth = getCurrentMonthPeriod();
        const verdict = await findVerdictByQuestionAndMonth(
          mainQuestion.id,
          currentMonth
        );

        // Get unique outlets from article stances for the main question
        const mainQuestionStances = await findArticleStancesByQuestionId(mainQuestion.id);
        const outletMap = new Map<string, { id: string; name: string }>();
        
        for (const stance of mainQuestionStances as any[]) {
          if (stance.article?.outlet) {
            const outlet = stance.article.outlet;
            if (!outletMap.has(outlet.id)) {
              outletMap.set(outlet.id, {
                id: outlet.id,
                name: outlet.name,
              });
            }
          }
        }
        firstQuestionOutlets = Array.from(outletMap.values());

        firstQuestionSummary = {
          id: mainQuestion.id,
          questionText: mainQuestion.questionText,
          isActive: mainQuestion.isActive,
          contextBlurb: (mainQuestion as any).contextBlurb ?? null,
          verdict: verdict
            ? {
                id: verdict.id,
                verdictLabel: verdict.verdictLabel as any,
                confidence: verdict.confidence,
                month: verdict.month.toISOString(),
              }
            : null,
        };
      }

      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        safetyNoteRequired: topic.safetyNoteRequired,
        questionCount: realQuestions.length, // Only count questions with articles
        activeQuestionCount: realQuestions.length, // Only count questions with articles
        createdAt: topic.createdAt.toISOString(),
        firstQuestion: firstQuestionSummary,
        // Include outlets for the first question (for TopicCard display)
        firstQuestionOutlets: firstQuestionOutlets,
      } as TopicDTO & { firstQuestionOutlets?: Array<{ id: string; name: string }> };
    })
  );
  
  // Filter out null entries (topics with no questions)
  return topicsWithData.filter((topic) => topic !== null) as TopicDTO[];
}

/**
 * Get topic by ID with questions
 */
export async function getTopicById(id: string): Promise<TopicDetailDTO | null> {
  const topic = await findTopicById(id);
  if (!topic) return null;

  const questions = await findQuestionsByTopicId(topic.id, false);
  const activeQuestions = questions.filter((q) => q.isActive);

  // Filter out questions without articles (same logic as getAllTopics)
  const questionsWithArticles = await Promise.all(
    activeQuestions.map(async (q) => {
      const stances = await findArticleStancesByQuestionId(q.id);
      return { question: q, hasArticles: stances.length > 0 };
    })
  );
  
  const realQuestions = questionsWithArticles
    .filter(({ hasArticles }) => hasArticles)
    .map(({ question }) => question);

  // Determine main question (same logic as getAllTopics)
  let mainQuestion = realQuestions[0] || null;
  const topicWithOverride = topic as any;
  if (topicWithOverride.mainQuestionId) {
    const override = realQuestions.find(
      (q) => q.id === topicWithOverride.mainQuestionId
    );
    if (override) {
      mainQuestion = override;
    }
  }

  if (!mainQuestion && realQuestions.length > 0) {
    // Compute counts for each question and pick the one with highest
    let best = realQuestions[0];
    let bestScore = -1;
    for (const q of realQuestions) {
      const stances = await findArticleStancesByQuestionId(q.id);
      const articleIds = new Set(stances.map((s) => s.articleId));
      const outletIds = new Set(
        stances
          .map((s) => (s as any).article?.outletId as string | undefined)
          .filter((id): id is string => !!id)
      );
      const score = articleIds.size + outletIds.size;
      if (score > bestScore) {
        bestScore = score;
        best = q;
      }
    }
    mainQuestion = best;
  }

  // Build question summaries with outlets - only include questions with articles (realQuestions)
  // Convert to QuestionCardDTO format to include outlets
  const questionCards: QuestionCardDTO[] = await Promise.all(
    realQuestions.map(async (question) => {
      const currentMonth = getCurrentMonthPeriod();
      const verdict = await findVerdictByQuestionAndMonth(
        question.id,
        currentMonth
      );

      // Get unique outlets from article stances
      // findArticleStancesByQuestionId includes article with outlet
      const articleStances = await findArticleStancesByQuestionId(question.id);
      const outletMap = new Map<string, { id: string; name: string }>();
      
      // Extract outlets from article stances (article and outlet are included in the query)
      for (const stance of articleStances as any[]) {
        if (stance.article?.outlet) {
          const outlet = stance.article.outlet;
          if (!outletMap.has(outlet.id)) {
            outletMap.set(outlet.id, {
              id: outlet.id,
              name: outlet.name,
            });
          }
        }
      }

      const outlets = Array.from(outletMap.values());

      return {
        id: question.id,
        questionText: question.questionText,
        isActive: question.isActive,
        topicId: topic.id,
        topicName: topic.name,
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
    })
  );

  // Build firstQuestion summary (same as getAllTopics)
  let firstQuestionSummary: QuestionSummaryDTO | null = null;
  let firstQuestionOutlets: Array<{ id: string; name: string }> = [];
  
  if (mainQuestion) {
    const currentMonth = getCurrentMonthPeriod();
    const verdict = await findVerdictByQuestionAndMonth(
      mainQuestion.id,
      currentMonth
    );

    // Get unique outlets from article stances for the main question
    const mainQuestionStances = await findArticleStancesByQuestionId(mainQuestion.id);
    const outletMap = new Map<string, { id: string; name: string }>();
    
    for (const stance of mainQuestionStances as any[]) {
      if (stance.article?.outlet) {
        const outlet = stance.article.outlet;
        if (!outletMap.has(outlet.id)) {
          outletMap.set(outlet.id, {
            id: outlet.id,
            name: outlet.name,
          });
        }
      }
    }
    firstQuestionOutlets = Array.from(outletMap.values());

    firstQuestionSummary = {
      id: mainQuestion.id,
      questionText: mainQuestion.questionText,
      isActive: mainQuestion.isActive,
      contextBlurb: (mainQuestion as any).contextBlurb ?? null,
      verdict: verdict
        ? {
            id: verdict.id,
            verdictLabel: verdict.verdictLabel as any,
            confidence: verdict.confidence,
            month: verdict.month.toISOString(),
          }
        : null,
    };
  }

  // Convert questionCards to QuestionSummaryDTO for backward compatibility
  const questionSummaries: QuestionSummaryDTO[] = questionCards.map((qc) => ({
    id: qc.id,
    questionText: qc.questionText,
    isActive: qc.isActive,
    contextBlurb: null, // Not included in QuestionCardDTO
    verdict: qc.verdict,
  }));

  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    safetyNoteRequired: topic.safetyNoteRequired,
    questionCount: questions.length,
    activeQuestionCount: realQuestions.length, // Count only questions with articles
    createdAt: topic.createdAt.toISOString(),
    firstQuestion: firstQuestionSummary,
    questions: questionSummaries,
    // Include questionCards for frontend to use (with outlets)
    questionCards,
    // Include outlets for the first question (for TopicCard display)
    firstQuestionOutlets: firstQuestionOutlets,
  } as TopicDetailDTO & { questionCards: QuestionCardDTO[]; firstQuestionOutlets?: Array<{ id: string; name: string }> };
}

/**
 * Get current verdict for a topic's active question
 */
export async function getTopicVerdict(
  topicId: string
): Promise<VerdictCardDTO | null> {
  const topic = await findTopicById(topicId);
  if (!topic) return null;

  const activeQuestions = await findQuestionsByTopicId(topic.id, false);
  const activeQuestion = activeQuestions.find((q) => q.isActive);
  if (!activeQuestion) return null;

  // Use verdictsService to get the verdict card
  const { getVerdictCard } = await import('./verdictsService.js');
  return getVerdictCard(activeQuestion.id);
}

