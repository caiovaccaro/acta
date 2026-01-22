/**
 * Question Repository
 * Handles Question model operations
 */

import { prisma } from '../index';
import type { Question, QuestionValidationStatus, TopicSource } from '@prisma/client';

export interface CreateQuestionInput {
  topicId: string;
  questionText: string;
  originalQuestionText?: string | null;
  confidence?: number | null;
  sourceArticlesCount?: number;
  validationStatus?: QuestionValidationStatus;
  validationResults?: Record<string, unknown> | null;
  suggestions?: string[];
  source?: TopicSource;
  discoveredAt?: Date | null;
  discoveredFromArticles?: Record<string, unknown> | null;
  isActive?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number | null;
}

export interface UpdateQuestionInput {
  questionText?: string;
  originalQuestionText?: string | null;
  contextBlurb?: string | null;
  confidence?: number | null;
  sourceArticlesCount?: number;
  validationStatus?: QuestionValidationStatus;
  validationResults?: Record<string, unknown> | null;
  suggestions?: string[];
  source?: TopicSource;
  discoveredAt?: Date | null;
  discoveredFromArticles?: Record<string, unknown> | null;
  isActive?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number | null;
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
      articleAnalysisAttempts: true,
      verdicts: {
        orderBy: { month: 'desc' },
        take: 1, // Get latest verdict for backward compatibility
      },
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
    orderBy: [
      { featuredOrder: 'asc' } as any,
      { createdAt: 'desc' },
    ],
    include: {
      topic: true,
      verdicts: {
        orderBy: { month: 'desc' },
        take: 1, // Get latest verdict for backward compatibility
      },
    },
  });
}

/**
 * Finds active questions
 * @param topicId - Optional filter by topic ID
 * @returns Array of active Questions
 */
export async function findActiveQuestions(topicId?: string): Promise<Question[]> {
  return prisma.question.findMany({
    where: {
      isActive: true,
      ...(topicId ? { topicId } : {}),
    },
    include: {
      topic: true,
      verdicts: {
        orderBy: { month: 'desc' },
        take: 1, // Get latest verdict for backward compatibility
      },
    },
    orderBy: [
      { featuredOrder: 'asc' } as any,
      { createdAt: 'desc' },
    ],
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
      validationResults: (input.validationResults ?? null) as any,
      suggestions: input.suggestions ?? [],
      source: input.source ?? 'seeded',
      discoveredAt: input.discoveredAt ?? null,
      discoveredFromArticles: (input.discoveredFromArticles ?? null) as any,
      isActive: input.isActive ?? false,
      isFeatured: input.isFeatured ?? false,
      featuredOrder: input.featuredOrder ?? null,
    } as any,
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
      validationResults: (input.validationResults ?? undefined) as any,
      suggestions: input.suggestions ?? undefined,
      source: input.source ?? undefined,
      discoveredAt: input.discoveredAt ?? undefined,
      discoveredFromArticles: (input.discoveredFromArticles ?? undefined) as any,
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

export interface ConvergeQuestionsInput {
  targetQuestionId: string;  // Question to keep
  sourceQuestionIds: string[];  // Questions to merge into target
  newQuestionText?: string;  // Optional: update question text
  newContextBlurb?: string;  // Optional: update context blurb
}

export interface ConvergeQuestionsResult {
  targetQuestion: Question;
  migratedArticleAnalysisAttempts: number;
  migratedArticleStances: number;
  migratedVerdicts: number;
  migratedTimelineEvents: number;
  createdRedirects: number;
  deletedQuestions: number;
}

/**
 * Finds a question redirect by old question ID
 * @param oldQuestionId - The old question ID that was merged
 * @returns QuestionRedirect or null if not found
 */
export async function findQuestionRedirect(oldQuestionId: string) {
  return (prisma as any).questionRedirect.findUnique({
    where: { oldQuestionId },
  });
}

/**
 * Converges multiple questions into a single target question.
 * Migrates all article analysis attempts, stances, verdicts, and timeline events from source questions to target.
 * Handles duplicates and preserves best data.
 * 
 * @param input - Convergence input data
 * @returns Convergence result with migration counts
 * @throws Error if validation fails or transaction fails
 */
export async function convergeQuestions(
  input: ConvergeQuestionsInput
): Promise<ConvergeQuestionsResult> {
  const { targetQuestionId, sourceQuestionIds, newQuestionText, newContextBlurb } = input;

  // Validation
  if (!targetQuestionId || !sourceQuestionIds || sourceQuestionIds.length === 0) {
    throw new Error('targetQuestionId and at least one sourceQuestionId are required');
  }

  if (sourceQuestionIds.includes(targetQuestionId)) {
    throw new Error('targetQuestionId cannot be in sourceQuestionIds');
  }

  // Remove duplicates from sourceQuestionIds
  const uniqueSourceIds = Array.from(new Set(sourceQuestionIds));
  if (uniqueSourceIds.length !== sourceQuestionIds.length) {
    console.warn('Duplicate source question IDs removed');
  }

  // Validate all questions exist
  const targetQuestion = await findQuestionById(targetQuestionId);
  if (!targetQuestion) {
    throw new Error(`Target question not found: ${targetQuestionId}`);
  }

  const sourceQuestions = await prisma.question.findMany({
    where: { id: { in: uniqueSourceIds } },
    include: {
      articleAnalysisAttempts: true,
      articleStances: true,
      verdicts: {
        include: {
          evidenceBullets: true,
        },
      },
      timelineEvents: true,
    },
  });

  if (sourceQuestions.length !== uniqueSourceIds.length) {
    const foundIds = sourceQuestions.map(q => q.id);
    const missingIds = uniqueSourceIds.filter(id => !foundIds.includes(id));
    throw new Error(`Source questions not found: ${missingIds.join(', ')}`);
  }

  // Note: Questions can be from different topics. The target question's topic will be kept.
  // All migrated data (stances, verdicts, etc.) will be associated with the target question's topic.

  // Execute convergence without a long interactive transaction to avoid timeouts.
  // Operations are idempotent and guarded to allow safe retries.
  let migratedArticleAnalysisAttempts = 0;
  let migratedArticleStances = 0;
  let migratedVerdicts = 0;
  let migratedTimelineEvents = 0;
  const duplicateAttemptIdsToDelete: string[] = [];

    // 1. Migrate ArticleAnalysisAttempts (handle duplicates: same article+question+month)
    for (const sourceQuestion of sourceQuestions) {
      for (const attempt of sourceQuestion.articleAnalysisAttempts) {
        // Check if target question has analysis attempt for same article+month
        const existing = await prisma.articleAnalysisAttempt.findFirst({
          where: {
            articleId: attempt.articleId,
            questionId: targetQuestionId,
            month: attempt.month,
          },
        });

        if (existing) {
          // Keep the one with highest confidence, or most recent if equal
          if (attempt.confidence > existing.confidence || 
              (attempt.confidence === existing.confidence && attempt.analyzedAt > existing.analyzedAt)) {
            await prisma.articleAnalysisAttempt.update({
              where: { id: existing.id },
              data: {
                stance: attempt.stance,
                confidence: attempt.confidence,
                reasoning: attempt.reasoning,
                analyzedAt: attempt.analyzedAt,
              },
            });
          }
          // Defer deleting the source attempt until after stances are migrated
          duplicateAttemptIdsToDelete.push(attempt.id);
        } else {
          // Migrate to target question
          await prisma.articleAnalysisAttempt.update({
            where: { id: attempt.id },
            data: { questionId: targetQuestionId },
          });
          migratedArticleAnalysisAttempts++;
        }
      }
    }

    // 2. Migrate ArticleStances (handle duplicates: same article+question)
    for (const sourceQuestion of sourceQuestions) {
      for (const stance of sourceQuestion.articleStances) {
        // Check if source stance still exists (might have been deleted already)
        const sourceStanceExists = await prisma.articleStance.findUnique({
          where: { id: stance.id },
        });

        if (!sourceStanceExists) {
          // Stance was already deleted, skip it
          continue;
        }

        // Check if target question has stance for same article
        const existing = await prisma.articleStance.findFirst({
          where: {
            articleId: stance.articleId,
            questionId: targetQuestionId,
          },
        });

        // Check if the source stance's attempt still exists (might have been deleted as duplicate)
        const sourceAttempt = await prisma.articleAnalysisAttempt.findUnique({
          where: { id: stance.articleAnalysisAttemptId },
        });
        
        // Find the kept attempt for this article+question (either the migrated source attempt or the kept duplicate)
        let keptAttempt = null;
        if (sourceAttempt && sourceAttempt.questionId === targetQuestionId) {
          // Source attempt exists and has been migrated
          keptAttempt = sourceAttempt;
        } else {
          // Source attempt was deleted - find the kept attempt for this article+question
          // Try to find by the same month first (most accurate)
          if (sourceAttempt) {
            const attemptByMonth = await prisma.articleAnalysisAttempt.findFirst({
              where: {
                articleId: stance.articleId,
                questionId: targetQuestionId,
                month: sourceAttempt.month,
              },
            });
            if (attemptByMonth) {
              keptAttempt = attemptByMonth;
            }
          }
          
          // If not found by month, get the most recent one for this article+question
          if (!keptAttempt) {
            const attemptsForArticle = await prisma.articleAnalysisAttempt.findMany({
              where: {
                articleId: stance.articleId,
                questionId: targetQuestionId,
              },
              orderBy: { analyzedAt: 'desc' },
              take: 1,
            });
            keptAttempt = attemptsForArticle[0] || null;
          }
        }
        
        if (existing) {
          // Target already has a stance for this article
          if (keptAttempt) {
            if (stance.matchedAt > existing.matchedAt) {
              // Update existing stance with kept attempt if source is more recent
              await prisma.articleStance.update({
                where: { id: existing.id },
                data: {
                  articleAnalysisAttemptId: keptAttempt.id,
                  matchedAt: stance.matchedAt,
                },
              });
              migratedArticleStances++; // Count as migrated (updated with source data)
            } else {
              // Source is not more recent, but we still processed it
              // Count it as migrated since we're consolidating the data
              migratedArticleStances++;
            }
          } else {
            // No kept attempt found, but target already has a stance - count as processed
            migratedArticleStances++;
          }
          
          // Delete the source stance (only if it still exists)
          try {
            await prisma.articleStance.delete({
              where: { id: stance.id },
            });
          } catch (deleteError: any) {
            // If stance was already deleted, continue
            if (deleteError.code !== 'P2025') {
              throw deleteError;
            }
          }
        } else {
          // Target doesn't have a stance for this article - migrate it
          if (keptAttempt) {
            // Found a kept attempt - migrate the stance to use it
            await prisma.articleStance.update({
              where: { id: stance.id },
              data: {
                questionId: targetQuestionId,
                articleAnalysisAttemptId: keptAttempt.id,
              },
            });
            migratedArticleStances++;
          } else {
            // No kept attempt found - but we should still try to create a stance
            // Check if there's ANY attempt for this article (even if not migrated yet)
            const anyAttempt = await prisma.articleAnalysisAttempt.findFirst({
              where: {
                articleId: stance.articleId,
                questionId: targetQuestionId,
              },
            });
            
            if (anyAttempt) {
              // Found an attempt - migrate the stance to use it
              await prisma.articleStance.update({
                where: { id: stance.id },
                data: {
                  questionId: targetQuestionId,
                  articleAnalysisAttemptId: anyAttempt.id,
                },
              });
              migratedArticleStances++;
            } else {
              // Truly no attempt found - this stance is orphaned, delete it
              try {
              await prisma.articleStance.delete({
                  where: { id: stance.id },
                });
              } catch (deleteError: any) {
                // If stance was already deleted, continue
                if (deleteError.code !== 'P2025') {
                  throw deleteError;
                }
              }
            }
          }
        }
      }
    }

    // 2.5. Delete duplicate attempts after stance migration to avoid cascade deletes
    // (Stances reference attempts, so we delete attempts only after stances are moved)
    for (const attemptId of duplicateAttemptIdsToDelete) {
      try {
        await prisma.articleAnalysisAttempt.delete({
          where: { id: attemptId },
        });
      } catch (deleteError: any) {
        if (deleteError.code !== 'P2025') {
          throw deleteError;
        }
      }
    }

    // 3. Migrate Verdicts (handle duplicates: same question+month)
    for (const sourceQuestion of sourceQuestions) {
      for (const verdict of sourceQuestion.verdicts) {
        // Check if target question has verdict for same month
        const existing = await prisma.verdict.findFirst({
          where: {
            questionId: targetQuestionId,
            month: verdict.month,
          },
          include: {
            evidenceBullets: true,
          },
        });

        if (existing) {
          // Calculate the next order number for new evidence bullets
          // Get current max order from existing bullets
          const maxOrder = existing.evidenceBullets.length > 0
            ? Math.max(...existing.evidenceBullets.map(eb => eb.order))
            : -1;
          let nextOrder = maxOrder + 1;
          
          // Keep verdict with highest confidence
          if (verdict.confidence > existing.confidence) {
            // Migrate evidence bullets from source to target (avoid duplicates)
            for (const evidenceBullet of verdict.evidenceBullets) {
              const duplicate = existing.evidenceBullets.find(
                eb => eb.text.trim().toLowerCase() === evidenceBullet.text.trim().toLowerCase()
              );
              
              if (!duplicate) {
                await prisma.evidenceBullet.create({
                  data: {
                    verdictId: existing.id,
                    text: evidenceBullet.text,
                    articleId: evidenceBullet.articleId,
                    type: evidenceBullet.type,
                    order: nextOrder++,
                  },
                });
              }
            }

            // Update existing verdict with source verdict data
            await prisma.verdict.update({
              where: { id: existing.id },
              data: {
                verdictLabel: verdict.verdictLabel,
                confidence: verdict.confidence,
                supportShare: verdict.supportShare,
                variance: verdict.variance,
                reasoning: verdict.reasoning,
                overviewBullets: verdict.overviewBullets as any,
                featuredPerspective: verdict.featuredPerspective as any,
              },
            });
          } else {
            // Still migrate evidence bullets even if keeping existing verdict
            // Use the same nextOrder counter (already accounts for existing bullets)
            for (const evidenceBullet of verdict.evidenceBullets) {
              const duplicate = existing.evidenceBullets.find(
                eb => eb.text.trim().toLowerCase() === evidenceBullet.text.trim().toLowerCase()
              );
              
              if (!duplicate) {
                await prisma.evidenceBullet.create({
                  data: {
                    verdictId: existing.id,
                    text: evidenceBullet.text,
                    articleId: evidenceBullet.articleId,
                    type: evidenceBullet.type,
                    order: nextOrder++,
                  },
                });
              }
            }
          }

          // Delete the source verdict (evidence bullets already migrated)
          await prisma.verdict.delete({
            where: { id: verdict.id },
          });
        } else {
          // Migrate to target question
          await prisma.verdict.update({
            where: { id: verdict.id },
            data: { questionId: targetQuestionId },
          });
          migratedVerdicts++;
        }
      }
    }

    // 4. Migrate TimelineEvents
    for (const sourceQuestion of sourceQuestions) {
      if (sourceQuestion.timelineEvents.length > 0) {
        const result = await prisma.timelineEvent.updateMany({
          where: { questionId: sourceQuestion.id },
          data: { questionId: targetQuestionId },
        });
        migratedTimelineEvents += result.count;
      }
    }

    // 5. Create QuestionRedirects for source questions
    let createdRedirects = 0;
    for (const sourceQuestion of sourceQuestions) {
      // Check if redirect already exists (idempotent)
      const existingRedirect = await (prisma as any).questionRedirect.findUnique({
        where: { oldQuestionId: sourceQuestion.id },
      });

      if (!existingRedirect) {
        try {
          // Verify the model is available in the transaction client
          if (!(prisma as any).questionRedirect) {
            throw new Error('QuestionRedirect model not available in Prisma client. Please regenerate Prisma client with: npm run db:generate and restart the server.');
          }
          
          await (prisma as any).questionRedirect.create({
            data: {
              oldQuestionId: sourceQuestion.id,
              newQuestionId: targetQuestionId,
              convergedAt: new Date(),
            },
          });
          createdRedirects++;
        } catch (redirectError: any) {
          // If redirect already exists (race condition), continue
          if (redirectError.code === 'P2002') {
            // Unique constraint violation - redirect already exists
            continue;
          }
          // Re-throw other errors
          throw redirectError;
        }
      }
    }

    // 6. Build audit trail
    const convergenceHistory = {
      convergedAt: new Date().toISOString(),
      sourceQuestions: sourceQuestions.map(q => ({
        id: q.id,
        questionText: q.questionText,
      })),
    };

    // Merge discoveredFromArticles if both have data
    let mergedDiscoveredFromArticles = targetQuestion.discoveredFromArticles;
    if (sourceQuestions.some(q => q.discoveredFromArticles)) {
      const sourceDiscovered = sourceQuestions
        .filter(q => q.discoveredFromArticles)
        .map(q => q.discoveredFromArticles);
      
      if (Array.isArray(mergedDiscoveredFromArticles)) {
        mergedDiscoveredFromArticles = [
          ...(mergedDiscoveredFromArticles as any[]),
          ...sourceDiscovered,
        ];
      } else {
        mergedDiscoveredFromArticles = sourceDiscovered;
      }
    }

    // Note: Verdicts will need to be recalculated after convergence to include all merged stances
    // This is done outside the transaction to avoid issues with Prisma client usage
    // The counts will be correct once verdicts are recalculated

    // 7. Update target question metadata
    const sourceBlurbs = sourceQuestions
      .map((q) => q.contextBlurb)
      .filter((blurb) => typeof blurb === 'string' && blurb.trim().length > 0) as string[];
    const bestSourceBlurb = sourceBlurbs.length > 0 ? sourceBlurbs[0] : null;
    const preservedBlurb =
      newContextBlurb !== undefined
        ? newContextBlurb
        : (targetQuestion.contextBlurb && targetQuestion.contextBlurb.trim().length > 0)
        ? targetQuestion.contextBlurb
        : bestSourceBlurb;

    const updateData: any = {
      questionText: newQuestionText || targetQuestion.questionText,
      contextBlurb: preservedBlurb,
      confidence: Math.max(
        targetQuestion.confidence || 0,
        ...sourceQuestions.map(q => q.confidence || 0)
      ) || null,
      sourceArticlesCount: targetQuestion.sourceArticlesCount + 
        sourceQuestions.reduce((sum, q) => sum + q.sourceArticlesCount, 0),
      isActive: targetQuestion.isActive || sourceQuestions.some(q => q.isActive),
      discoveredFromArticles: mergedDiscoveredFromArticles as any,
    };

    // Store convergence history in discoveredFromArticles
    if (targetQuestion.discoveredFromArticles) {
      const currentHistory = Array.isArray(targetQuestion.discoveredFromArticles)
        ? targetQuestion.discoveredFromArticles
        : [targetQuestion.discoveredFromArticles];
      updateData.discoveredFromArticles = [
        ...currentHistory,
        { type: 'convergence', ...convergenceHistory },
      ] as any;
    } else {
      updateData.discoveredFromArticles = [
        { type: 'convergence', ...convergenceHistory },
      ] as any;
    }

    const updatedTargetQuestion = await prisma.question.update({
      where: { id: targetQuestionId },
      data: updateData as any,
    });

    // 8. Delete source questions
    const deleteResult = await prisma.question.deleteMany({
      where: { id: { in: uniqueSourceIds } },
    });

    const result = {
      targetQuestion: updatedTargetQuestion,
      migratedArticleAnalysisAttempts,
      migratedArticleStances,
      migratedVerdicts,
      migratedTimelineEvents,
      createdRedirects,
      deletedQuestions: deleteResult.count,
    };

    // Recalculate verdicts for target question after transaction completes
    // This ensures article and outlet counts are correct after convergence
    // Get all unique months from verdicts
    const verdictMonths = new Set<Date>();
    for (const sourceQuestion of sourceQuestions) {
      for (const verdict of sourceQuestion.verdicts) {
        verdictMonths.add(verdict.month);
      }
    }
    // Also include target question's existing verdict months
    const targetVerdicts = await prisma.verdict.findMany({
      where: { questionId: targetQuestionId },
      select: { month: true },
    });
    targetVerdicts.forEach(v => verdictMonths.add(v.month));
    
    // Recalculate verdicts for each month to include all merged stances
    // This ensures article and outlet counts are correct after convergence
    const { recalculateVerdict } = await import('@acta/core');
    for (const month of Array.from(verdictMonths)) {
      try {
        await recalculateVerdict(targetQuestionId, month);
      } catch (error) {
        console.warn(`Failed to recalculate verdict for month ${month.toISOString()}:`, error);
        // Continue with other months even if one fails
      }
    }

    return result;
}

