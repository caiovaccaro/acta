import type { PrismaClient } from '@prisma/client';
import type { NotificationKind, NotificationReceipt } from '../../../core/src/notifications/types';

export async function recordPipelineNotification(input: {
  pipelineRunId?: string | null;
  kind: NotificationKind;
  receipt: NotificationReceipt;
  subject: string;
  providerMessageId?: string;
}, db: PrismaClient): Promise<void> {
  const status = input.receipt.sent ? 'accepted' : (input.receipt.reason ?? 'network');
  await db.pipelineNotification.create({
    data: {
      pipelineRunId: input.pipelineRunId ?? undefined,
      kind: input.kind,
      status,
      subject: input.subject.slice(0, 200),
      providerMessageId: input.providerMessageId,
      errorCode: input.receipt.sent ? null : status,
    },
  });
}

export async function countQueueDepths(db: PrismaClient): Promise<{
  pending: number;
  inProgress: number;
  failed: number;
}> {
  const [pending, inProgress, failed] = await Promise.all([
    db.crawlRequest.count({ where: { status: 'pending' } }),
    db.crawlRequest.count({ where: { status: 'in_progress' } }),
    db.crawlRequest.count({ where: { status: 'failed' } }),
  ]);
  return { pending, inProgress, failed };
}

export async function countPendingModeration(db: PrismaClient): Promise<{
  topicsPending: number;
  questionsPending: number;
}> {
  const [topicsPending, questionsPending] = await Promise.all([
    db.topic.count({ where: { moderationStatus: 'pending' } }),
    db.question.count({ where: { validationStatus: 'pending' } }),
  ]);
  return { topicsPending, questionsPending };
}
