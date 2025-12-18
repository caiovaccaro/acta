import {
  findAllTopics,
  findTopicById,
  findQuestionsByTopicId,
} from '@acta/db';
import { findVerdictByQuestionAndMonth } from '@acta/db';
import { getCurrentMonthPeriod } from '@acta/core';
import type {
  TopicDTO,
  TopicDetailDTO,
  QuestionSummaryDTO,
  VerdictCardDTO,
} from '@acta/shared';

/**
 * Get all topics
 */
export async function getAllTopics(
  includeInactive: boolean = false
): Promise<TopicDTO[]> {
  const topics = await findAllTopics(!includeInactive);

  return Promise.all(
    topics.map(async (topic) => {
      const questions = await findQuestionsByTopicId(topic.id, false);
      const activeQuestions = questions.filter((q) => q.isActive);

      return {
        id: topic.id,
        name: topic.name,
        description: topic.description,
        safetyNoteRequired: topic.safetyNoteRequired,
        questionCount: questions.length,
        activeQuestionCount: activeQuestions.length,
        createdAt: topic.createdAt.toISOString(),
      };
    })
  );
}

/**
 * Get topic by ID with questions
 */
export async function getTopicById(id: string): Promise<TopicDetailDTO | null> {
  const topic = await findTopicById(id);
  if (!topic) return null;

  const questions = await findQuestionsByTopicId(topic.id, false);

  const questionSummaries: QuestionSummaryDTO[] = await Promise.all(
    questions.map(async (question) => {
      const currentMonth = getCurrentMonthPeriod();
      const verdict = await findVerdictByQuestionAndMonth(
        question.id,
        currentMonth
      );

      return {
        id: question.id,
        questionText: question.questionText,
        isActive: question.isActive,
        verdict: verdict
          ? {
              id: verdict.id,
              verdictLabel: verdict.verdictLabel as any,
              confidence: verdict.confidence,
              month: verdict.month.toISOString(),
            }
          : null,
      };
    })
  );

  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    safetyNoteRequired: topic.safetyNoteRequired,
    questionCount: questions.length,
    activeQuestionCount: questions.filter((q) => q.isActive).length,
    createdAt: topic.createdAt.toISOString(),
    questions: questionSummaries,
  };
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

