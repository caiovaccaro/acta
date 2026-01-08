/**
 * Verdict Repository
 * Handles Verdict model operations
 */

import { prisma } from '../index';
import type { Verdict, VerdictLabel } from '@prisma/client';

export interface CreateVerdictInput {
  questionId: string;
  month: Date; // Month period (normalized to first day of month)
  verdictLabel: VerdictLabel;
  confidence: number; // 0-100
  supportShare: number; // 0-1
  variance: number; // 0-1
  reasoning?: string | null; // Optional summary text
}

export interface UpdateVerdictInput {
  verdictLabel?: VerdictLabel;
  confidence?: number;
  supportShare?: number;
  variance?: number;
  reasoning?: string | null;
  overviewBullets?: any; // Json? in Prisma schema
  featuredPerspective?: any; // Json? in Prisma schema
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
 * Finds a verdict by question ID and month
 * @param questionId - Question ID
 * @param month - Month period (normalized to first day of month)
 * @returns Verdict or null if not found
 */
export async function findVerdictByQuestionAndMonth(
  questionId: string,
  month: Date
): Promise<Verdict | null> {
  return prisma.verdict.findUnique({
    where: {
      questionId_month: {
        questionId,
        month,
      },
    },
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
 * Finds all verdicts for a question (historical verdicts across all months)
 * @param questionId - Question ID
 * @returns Array of Verdicts ordered by month (most recent first)
 */
export async function findVerdictsByQuestion(
  questionId: string
): Promise<Verdict[]> {
  return prisma.verdict.findMany({
    where: { questionId },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
      evidenceBullets: true,
    },
    orderBy: { month: 'desc' },
  });
}

/**
 * Finds the latest verdict for a question (most recent month)
 * @param questionId - Question ID
 * @returns Verdict or null if not found
 */
export async function findLatestVerdictByQuestion(
  questionId: string
): Promise<Verdict | null> {
  return prisma.verdict.findFirst({
    where: { questionId },
    include: {
      question: {
        include: {
          topic: true,
        },
      },
      evidenceBullets: true,
    },
    orderBy: { month: 'desc' },
  });
}

/**
 * Finds a verdict by question ID (backward compatibility - returns latest)
 * @param questionId - Question ID
 * @returns Latest Verdict or null if not found
 * @deprecated Use findLatestVerdictByQuestion or findVerdictByQuestionAndMonth instead
 */
export async function findVerdictByQuestionId(
  questionId: string
): Promise<Verdict | null> {
  return findLatestVerdictByQuestion(questionId);
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
  // Clamp confidence to 0-100 to prevent values exceeding 100
  const clampedConfidence = Math.max(0, Math.min(100, input.confidence));
  
  return prisma.verdict.create({
    data: {
      questionId: input.questionId,
      month: input.month,
      verdictLabel: input.verdictLabel,
      confidence: clampedConfidence,
      supportShare: input.supportShare,
      variance: input.variance,
      reasoning: input.reasoning ?? null,
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
 * Creates or updates a verdict (upsert by questionId and month)
 * If a verdict exists for the same question and month, it updates it.
 * If it's a new month, it creates a new verdict entry.
 * @param input - Verdict input data (must include month)
 * @returns Created or updated Verdict
 */
export async function createOrUpdateVerdict(
  input: CreateVerdictInput
): Promise<Verdict> {
  // Clamp confidence to 0-100 to prevent values exceeding 100
  const clampedConfidence = Math.max(0, Math.min(100, input.confidence));
  
  // Use raw SQL to handle upsert with the composite unique constraint
  // Use the constraint name explicitly to avoid ambiguity
  const result = await prisma.$queryRaw<Array<{
    id: string;
    questionId: string;
    month: Date;
    verdictLabel: string;
    confidence: number;
    supportShare: number;
    variance: number;
    reasoning: string | null;
    calculatedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }>>`
    INSERT INTO "verdicts" ("id", "questionId", "month", "verdictLabel", "confidence", "supportShare", "variance", "reasoning", "calculatedAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), ${input.questionId}::text, ${input.month}::timestamp, ${input.verdictLabel}::"VerdictLabel", ${clampedConfidence}::float, ${input.supportShare}::float, ${input.variance}::float, ${input.reasoning ?? null}::text, NOW(), NOW(), NOW())
    ON CONFLICT ON CONSTRAINT "verdicts_questionId_month_key"
    DO UPDATE SET
      "verdictLabel" = EXCLUDED."verdictLabel"::"VerdictLabel",
      "confidence" = EXCLUDED."confidence",
      "supportShare" = EXCLUDED."supportShare",
      "variance" = EXCLUDED."variance",
      "reasoning" = EXCLUDED."reasoning",
      "calculatedAt" = NOW(),
      "updatedAt" = NOW()
    RETURNING *
  `;

  if (!result || result.length === 0) {
    throw new Error('Failed to create or update verdict');
  }

  const verdictData = result[0];

  // Fetch the full verdict with relations
  return prisma.verdict.findUniqueOrThrow({
    where: { id: verdictData.id },
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
  // Clamp confidence to 0-100 if provided
  const updateData = { ...input };
  if (updateData.confidence !== undefined) {
    updateData.confidence = Math.max(0, Math.min(100, updateData.confidence));
  }
  
  return prisma.verdict.update({
    where: { id },
    data: updateData,
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

