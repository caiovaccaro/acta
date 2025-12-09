/**
 * Question Repository
 * Handles Question model operations
 */

import { prisma } from '../index.js';
import type { Question, QuestionValidationStatus } from '@prisma/client';

export interface CreateQuestionInput {
  topicId: string;
  questionText: string;
  originalQuestionText?: string | null;
  confidence?: number | null;
  sourceArticlesCount?: number;
  validationStatus?: QuestionValidationStatus;
  validationResults?: Record<string, unknown> | null;
  isActive?: boolean;
}

export interface UpdateQuestionInput {
  questionText?: string;
  originalQuestionText?: string | null;
  confidence?: number | null;
  sourceArticlesCount?: number;
  validationStatus?: QuestionValidationStatus;
  validationResults?: Record<string, unknown> | null;
  isActive?: boolean;
}

/**
 * Finds a question by ID
 * @param id - Question ID
 * @returns Question or null if not found
 */
export async function findQuestionById(id: string): Promise<Question | null> {
  return prisma.question.findUnique({
    where: { id },
    include: {
      topic: true,
      articleAnalyses: true,
      verdict: true,
    },
  });
}

/**
 * Finds questions by topic ID
 * @param topicId - Topic ID
 * @param includeInactive - Whether to include inactive questions
 * @returns Array of Questions
 */
export async function findQuestionsByTopicId(
  topicId: string,
  includeInactive: boolean = false
): Promise<Question[]> {
  return prisma.question.findMany({
    where: {
      topicId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      topic: true,
      verdict: true,
    },
  });
}

/**
 * Finds active questions
 * @returns Array of active Questions
 */
export async function findActiveQuestions(): Promise<Question[]> {
  return prisma.question.findMany({
    where: { isActive: true },
    include: {
      topic: true,
      verdict: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Finds questions by validation status
 * @param status - Validation status
 * @returns Array of Questions
 */
export async function findQuestionsByValidationStatus(
  status: QuestionValidationStatus
): Promise<Question[]> {
  return prisma.question.findMany({
    where: { validationStatus: status },
    include: {
      topic: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Creates a new question
 * @param input - Question input data
 * @returns Created Question
 */
export async function createQuestion(input: CreateQuestionInput): Promise<Question> {
  return prisma.question.create({
    data: {
      topicId: input.topicId,
      questionText: input.questionText,
      originalQuestionText: input.originalQuestionText ?? null,
      confidence: input.confidence ?? null,
      sourceArticlesCount: input.sourceArticlesCount ?? 0,
      validationStatus: input.validationStatus ?? 'pending',
      validationResults: input.validationResults ?? null,
      isActive: input.isActive ?? false,
    },
    include: {
      topic: true,
    },
  });
}

/**
 * Updates an existing question
 * @param id - Question ID
 * @param input - Update data
 * @returns Updated Question
 */
export async function updateQuestion(
  id: string,
  input: UpdateQuestionInput
): Promise<Question> {
  return prisma.question.update({
    where: { id },
    data: {
      ...input,
      originalQuestionText: input.originalQuestionText ?? undefined,
      confidence: input.confidence ?? undefined,
      validationResults: input.validationResults ?? undefined,
    },
    include: {
      topic: true,
    },
  });
}

/**
 * Activates a question (sets isActive to true and validationStatus to validated)
 * @param id - Question ID
 * @returns Updated Question
 */
export async function activateQuestion(id: string): Promise<Question> {
  return prisma.question.update({
    where: { id },
    data: {
      isActive: true,
      validationStatus: 'validated',
    },
    include: {
      topic: true,
    },
  });
}

/**
 * Deactivates a question (sets isActive to false)
 * @param id - Question ID
 * @returns Updated Question
 */
export async function deactivateQuestion(id: string): Promise<Question> {
  return prisma.question.update({
    where: { id },
    data: {
      isActive: false,
    },
    include: {
      topic: true,
    },
  });
}

/**
 * Deletes a question
 * @param id - Question ID
 * @returns Deleted Question
 */
export async function deleteQuestion(id: string): Promise<Question> {
  return prisma.question.delete({
    where: { id },
  });
}

