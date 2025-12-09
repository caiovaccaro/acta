/**
 * Verdict Repository
 * Handles Verdict model operations
 */

import { prisma } from '../index.js';
import type { Verdict, VerdictLabel } from '@prisma/client';

export interface CreateVerdictInput {
  questionId: string;
  verdictLabel: VerdictLabel;
  confidence: number; // 0-100
  supportShare: number; // 0-1
  variance: number; // 0-1
}

export interface UpdateVerdictInput {
  verdictLabel?: VerdictLabel;
  confidence?: number;
  supportShare?: number;
  variance?: number;
}

/**
 * Finds a verdict by ID
 * @param id - Verdict ID
 * @returns Verdict or null if not found
 */
export async function findVerdictById(id: string): Promise<Verdict | null> {
  return prisma.verdict.findUnique({
    where: { id },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
      evidenceBullets: true,
    },
  });
}

/**
 * Finds a verdict by question ID
 * @param questionId - Question ID
 * @returns Verdict or null if not found
 */
export async function findVerdictByQuestionId(
  questionId: string
): Promise<Verdict | null> {
  return prisma.verdict.findUnique({
    where: { questionId },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
      evidenceBullets: true,
    },
  });
}

/**
 * Finds all verdicts
 * @returns Array of Verdicts
 */
export async function findAllVerdicts(): Promise<Verdict[]> {
  return prisma.verdict.findMany({
    include: {
      question: {
        include: {
          topic: true,
        },
      },
      evidenceBullets: true,
    },
    orderBy: { calculatedAt: 'desc' },
  });
}

/**
 * Creates a new verdict
 * @param input - Verdict input data
 * @returns Created Verdict
 */
export async function createVerdict(input: CreateVerdictInput): Promise<Verdict> {
  return prisma.verdict.create({
    data: {
      questionId: input.questionId,
      verdictLabel: input.verdictLabel,
      confidence: input.confidence,
      supportShare: input.supportShare,
      variance: input.variance,
    },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Creates or updates a verdict (upsert by questionId)
 * @param input - Verdict input data
 * @returns Created or updated Verdict
 */
export async function createOrUpdateVerdict(
  input: CreateVerdictInput
): Promise<Verdict> {
  return prisma.verdict.upsert({
    where: { questionId: input.questionId },
    create: {
      questionId: input.questionId,
      verdictLabel: input.verdictLabel,
      confidence: input.confidence,
      supportShare: input.supportShare,
      variance: input.variance,
    },
    update: {
      verdictLabel: input.verdictLabel,
      confidence: input.confidence,
      supportShare: input.supportShare,
      variance: input.variance,
      calculatedAt: new Date(),
    },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Updates an existing verdict
 * @param id - Verdict ID
 * @param input - Update data
 * @returns Updated Verdict
 */
export async function updateVerdict(
  id: string,
  input: UpdateVerdictInput
): Promise<Verdict> {
  return prisma.verdict.update({
    where: { id },
    data: input,
    include: {
      question: {
        include: {
          topic: true,
        },
      },
    },
  });
}

/**
 * Deletes a verdict
 * @param id - Verdict ID
 * @returns Deleted Verdict
 */
export async function deleteVerdict(id: string): Promise<Verdict> {
  return prisma.verdict.delete({
    where: { id },
  });
}

