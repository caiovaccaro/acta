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

function getMonthBounds(month: Date): { start: Date; end: Date } {
  const start = new Date(
    month.getFullYear(),
    month.getMonth(),
    1,
    0,
    0,
    0,
    0
  );
  const end = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    1,
    0,
    0,
    0,
    0
  );
  return { start, end };
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
  const { start, end } = getMonthBounds(month);
  return prisma.verdict.findFirst({
    where: {
      questionId,
      month: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
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
  const { start, end } = getMonthBounds(input.month);

  // Resolve by calendar month window to avoid timestamp drift mismatches.
  const existing = await prisma.verdict.findFirst({
    where: {
      questionId: input.questionId,
      month: {
        gte: start,
        lt: end,
      },
    },
    orderBy: [{ updatedAt: 'desc' }],
  });

  if (existing) {
    const updated = await prisma.verdict.update({
      where: { id: existing.id },
      data: {
        verdictLabel: input.verdictLabel,
        confidence: clampedConfidence,
        supportShare: input.supportShare,
        variance: input.variance,
        calculatedAt: new Date(),
        ...(input.reasoning !== undefined ? { reasoning: input.reasoning } : {}),
      },
      include: {
        question: {
          include: {
            topic: true,
          },
        },
      },
    });
    return updated;
  }

  return prisma.verdict.create({
    data: {
      questionId: input.questionId,
      month: start,
      verdictLabel: input.verdictLabel,
      confidence: clampedConfidence,
      supportShare: input.supportShare,
      variance: input.variance,
      reasoning: input.reasoning ?? null,
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

