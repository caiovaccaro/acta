import { prisma } from '@acta/db';
import type { FeedbackCreateDTO, FeedbackDTO } from '@acta/shared';

/**
 * Create feedback
 * Note: This is a placeholder - feedback table may not exist yet
 */
export async function createFeedback(
  input: FeedbackCreateDTO
): Promise<FeedbackDTO> {
  // TODO: Implement feedback creation when Feedback model is available
  // For now, return a mock response
  return {
    id: 'temp-feedback-id',
    verdictId: input.verdictId,
    type: input.type,
    notes: input.notes || null,
    createdAt: new Date().toISOString(),
  };
}




