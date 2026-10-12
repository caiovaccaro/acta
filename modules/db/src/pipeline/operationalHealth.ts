import type { PrismaClient } from '@prisma/client';
import {
  mapOperationalHealth,
  redactHealthError,
  type OperationalHealth,
} from '../../../core/src/operations/health';
import { remainingMonthlyBudget } from '../repositories/llmBudgetRepository';
import {
  countPendingModeration,
  countQueueDepths,
} from '../repositories/pipelineNotificationRepository';

export async function loadOperationalHealth(input: {
  authorized: boolean;
  now?: Date;
  db: PrismaClient;
}): Promise<OperationalHealth> {
  const now = input.now ?? new Date();
  if (!input.authorized) {
    return mapOperationalHealth({ authorized: false, now });
  }

  const errors: { run?: boolean; queues?: boolean; moderation?: boolean; budget?: boolean } = {};
  let lastRun: { status: string; heartbeatAt?: Date | null; finishedAt?: Date | null } | null = null;
  let queues: { pending: number; inProgress: number; failed: number } | null = null;
  let moderation: { topicsPending: number; questionsPending: number } | null = null;
  let budget: { remainingUsd: string; ceilingUsd: string } | null = null;

  try {
    lastRun = await input.db.pipelineRun.findFirst({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { status: true, heartbeatAt: true, finishedAt: true },
    });
  } catch {
    errors.run = true;
  }

  try {
    queues = await countQueueDepths(input.db);
  } catch {
    errors.queues = true;
  }

  try {
    moderation = await countPendingModeration(input.db);
  } catch {
    errors.moderation = true;
  }

  try {
    budget = await remainingMonthlyBudget({ now }, input.db);
  } catch {
    errors.budget = true;
  }

  return mapOperationalHealth({
    authorized: true,
    now,
    lastRun,
    queues,
    moderation,
    budget,
    errors,
  });
}

export { redactHealthError };
