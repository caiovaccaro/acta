/**
 * EvidenceBullet Repository
 * Handles EvidenceBullet model operations
 */

import { prisma } from '../index';
import type { EvidenceBullet, EvidenceType } from '@prisma/client';

/**
 * Normalizes text for duplicate detection (trim, lowercase, remove extra whitespace)
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Checks if two normalized texts are duplicates (exact match or one contains the other)
 * Returns: 0 = no match, 1 = exact match, 2 = text1 contains text2, 3 = text2 contains text1
 */
function isDuplicateText(text1: string, text2: string): number {
  const normalized1 = normalizeText(text1);
  const normalized2 = normalizeText(text2);
  
  if (normalized1 === normalized2) {
    return 1; // Exact match
  }
  
  // Check if one contains the other (substring match)
  // Only consider it a duplicate if the shorter text is substantial (>= 50 chars)
  // and one clearly contains the other
  const minLength = Math.min(normalized1.length, normalized2.length);
  
  if (minLength < 50) {
    // For very short texts, require exact match
    return 0;
  }
  
  // If one text contains the other, it's a duplicate (keep the longer one)
  if (normalized1.includes(normalized2)) {
    return 2; // text1 contains text2 (keep text1, remove text2)
  }
  
  if (normalized2.includes(normalized1)) {
    return 3; // text2 contains text1 (keep text2, remove text1)
  }
  
  return 0; // No match
}

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
 * Creates a new evidence bullet with duplicate check
 * @param input - EvidenceBullet input data
 * @returns Created EvidenceBullet or existing if duplicate
 */
export async function createEvidenceBullet(
  input: CreateEvidenceBulletInput
): Promise<EvidenceBullet> {
  // Check for existing duplicate
  const existingBullets = await prisma.evidenceBullet.findMany({
    where: { verdictId: input.verdictId },
  });
  
  const normalizedText = normalizeText(input.text);
  const articleId = input.articleId || null;
  
  const duplicate = existingBullets.find((existing) => {
    const existingArticleId = existing.articleId || null;
    // Check for exact match or substring match
    const matchType = isDuplicateText(existing.text, input.text);
    return (
      matchType > 0 && // Any type of match (exact or substring)
      existing.type === input.type &&
      existingArticleId === articleId
    );
  });
  
  if (duplicate) {
    console.log(`[createEvidenceBullet] Duplicate evidence bullet found, returning existing: ${duplicate.id}`);
    return prisma.evidenceBullet.findUniqueOrThrow({
      where: { id: duplicate.id },
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
 * Creates multiple evidence bullets with deduplication
 * Prevents creating duplicates: same verdictId, normalized text, type, and articleId
 * @param inputs - Array of EvidenceBullet input data
 * @returns Array of created EvidenceBullets (deduplicated)
 */
export async function createEvidenceBullets(
  inputs: CreateEvidenceBulletInput[]
): Promise<EvidenceBullet[]> {
  if (inputs.length === 0) {
    return [];
  }
  
  // Deduplicate inputs before creating (handles exact matches and substring matches)
  const deduplicated: CreateEvidenceBulletInput[] = [];
  
  for (const input of inputs) {
    let isDuplicate = false;
    
    // Check against already deduplicated inputs
    for (let i = 0; i < deduplicated.length; i++) {
      const existing = deduplicated[i];
      if (
        existing.verdictId === input.verdictId &&
        existing.type === input.type &&
        (existing.articleId || null) === (input.articleId || null)
      ) {
        const matchType = isDuplicateText(existing.text, input.text);
        if (matchType > 0) {
          // Found a duplicate - keep the longer one
          if (matchType === 3) {
            // input contains existing (input is longer), replace existing with input
            deduplicated[i] = input;
          }
          // If matchType === 1 (exact) or 2 (existing contains input), keep existing
          isDuplicate = true;
          break;
        }
      }
    }
    
    if (!isDuplicate) {
      deduplicated.push(input);
    }
  }
  
  if (deduplicated.length < inputs.length) {
    console.log(`[createEvidenceBullets] Deduplicated ${inputs.length - deduplicated.length} duplicate evidence bullets`);
  }
  
  // Check for existing bullets to avoid database duplicates
  const verdictId = deduplicated[0]?.verdictId;
  if (verdictId) {
    const existingBullets = await prisma.evidenceBullet.findMany({
      where: { verdictId },
      select: {
        id: true,
        text: true,
        type: true,
        articleId: true,
      },
    });
    
    // Filter out any that already exist (check for exact matches and substring matches)
    const toCreate = deduplicated.filter((input) => {
      const articleId = input.articleId || null;
      
      return !existingBullets.some((existing) => {
        const existingArticleId = existing.articleId || null;
        const matchType = isDuplicateText(existing.text, input.text);
        return (
          matchType > 0 && // Any type of match
          existing.type === input.type &&
          existingArticleId === articleId
        );
      });
    });
    
    if (toCreate.length === 0) {
      console.log(`[createEvidenceBullets] All evidence bullets already exist for verdict ${verdictId}`);
      // Return existing bullets that match (using substring detection)
      const matching = existingBullets.filter((existing) => {
        const existingArticleId = existing.articleId || null;
        return deduplicated.some((input) => {
          const inputArticleId = input.articleId || null;
          const matchType = isDuplicateText(existing.text, input.text);
          return (
            matchType > 0 && // Any type of match
            existing.type === input.type &&
            existingArticleId === inputArticleId
          );
        });
      });
      return prisma.evidenceBullet.findMany({
        where: {
          id: { in: matching.map(m => m.id) },
        },
      });
    }
    
    if (toCreate.length < deduplicated.length) {
      console.log(`[createEvidenceBullets] Skipped ${deduplicated.length - toCreate.length} evidence bullets that already exist`);
    }
    
    // Create only the new ones
    return prisma.$transaction(
      toCreate.map((input) =>
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
  
  // Fallback: create all deduplicated inputs
  return prisma.$transaction(
    deduplicated.map((input) =>
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

