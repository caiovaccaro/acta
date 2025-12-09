/**
 * EvidenceBullet Repository
 * Handles EvidenceBullet model operations
 */

import { prisma } from '../index.js';
import type { EvidenceBullet, EvidenceType } from '@prisma/client';

export interface CreateEvidenceBulletInput {
  verdictId: string;
  text: string;
  articleId?: string | null;
  type: EvidenceType;
  order: number;
}

export interface UpdateEvidenceBulletInput {
  text?: string;
  articleId?: string | null;
  type?: EvidenceType;
  order?: number;
}

/**
 * Finds an evidence bullet by ID
 * @param id - EvidenceBullet ID
 * @returns EvidenceBullet or null if not found
 */
export async function findEvidenceBulletById(
  id: string
): Promise<EvidenceBullet | null> {
  return prisma.evidenceBullet.findUnique({
    where: { id },
    include: {
      verdict: {
        include: {
          question: {
            include: {
              topic: true,
            },
          },
        },
      },
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Finds evidence bullets by verdict ID
 * @param verdictId - Verdict ID
 * @returns Array of EvidenceBullets ordered by order field
 */
export async function findEvidenceBulletsByVerdictId(
  verdictId: string
): Promise<EvidenceBullet[]> {
  return prisma.evidenceBullet.findMany({
    where: { verdictId },
    include: {
      article: {
        include: {
          outlet: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });
}

/**
 * Finds evidence bullets by type
 * @param type - Evidence type
 * @param verdictId - Optional verdict ID filter
 * @returns Array of EvidenceBullets
 */
export async function findEvidenceBulletsByType(
  type: EvidenceType,
  verdictId?: string
): Promise<EvidenceBullet[]> {
  return prisma.evidenceBullet.findMany({
    where: {
      type,
      ...(verdictId ? { verdictId } : {}),
    },
    include: {
      verdict: {
        include: {
          question: {
            include: {
              topic: true,
            },
          },
        },
      },
      article: {
        include: {
          outlet: true,
        },
      },
    },
    orderBy: { order: 'asc' },
  });
}

/**
 * Creates a new evidence bullet
 * @param input - EvidenceBullet input data
 * @returns Created EvidenceBullet
 */
export async function createEvidenceBullet(
  input: CreateEvidenceBulletInput
): Promise<EvidenceBullet> {
  return prisma.evidenceBullet.create({
    data: {
      verdictId: input.verdictId,
      text: input.text,
      articleId: input.articleId ?? null,
      type: input.type,
      order: input.order,
    },
    include: {
      verdict: {
        include: {
          question: {
            include: {
              topic: true,
            },
          },
        },
      },
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Creates multiple evidence bullets
 * @param inputs - Array of EvidenceBullet input data
 * @returns Array of created EvidenceBullets
 */
export async function createEvidenceBullets(
  inputs: CreateEvidenceBulletInput[]
): Promise<EvidenceBullet[]> {
  return prisma.$transaction(
    inputs.map((input) =>
      prisma.evidenceBullet.create({
        data: {
          verdictId: input.verdictId,
          text: input.text,
          articleId: input.articleId ?? null,
          type: input.type,
          order: input.order,
        },
      })
    )
  );
}

/**
 * Updates an existing evidence bullet
 * @param id - EvidenceBullet ID
 * @param input - Update data
 * @returns Updated EvidenceBullet
 */
export async function updateEvidenceBullet(
  id: string,
  input: UpdateEvidenceBulletInput
): Promise<EvidenceBullet> {
  return prisma.evidenceBullet.update({
    where: { id },
    data: {
      ...input,
      articleId: input.articleId ?? undefined,
    },
    include: {
      verdict: {
        include: {
          question: {
            include: {
              topic: true,
            },
          },
        },
      },
      article: {
        include: {
          outlet: true,
        },
      },
    },
  });
}

/**
 * Deletes an evidence bullet
 * @param id - EvidenceBullet ID
 * @returns Deleted EvidenceBullet
 */
export async function deleteEvidenceBullet(id: string): Promise<EvidenceBullet> {
  return prisma.evidenceBullet.delete({
    where: { id },
  });
}

/**
 * Deletes all evidence bullets for a verdict
 * @param verdictId - Verdict ID
 * @returns Count of deleted bullets
 */
export async function deleteEvidenceBulletsByVerdictId(
  verdictId: string
): Promise<number> {
  const result = await prisma.evidenceBullet.deleteMany({
    where: { verdictId },
  });
  return result.count;
}

