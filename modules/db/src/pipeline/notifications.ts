import type { PrismaClient } from '@prisma/client';
import {
  resolveNotificationConfig,
  sendResendEmail,
  type ResendClientConfig,
} from '../../../core/src/notifications/resend';
import {
  renderAutoApprovalNotice,
  renderModerationDigest,
  renderReceipt,
} from '../../../core/src/notifications/templates';
import type { NotificationReceipt, ReceiptView } from '../../../core/src/notifications/types';
import {
  countPendingModeration,
  countQueueDepths,
  recordPipelineNotification,
} from '../repositories/pipelineNotificationRepository';

interface SliceNotificationSummary {
  runId: string | null;
  status: string;
  trigger: string | null;
  stages: Array<{ stage: string; metrics: unknown }>;
  backlogRemaining: boolean;
  budget: { remainingUsd: string; ceilingUsd: string };
  ledger: { estimatedCostUsd: string };
  errorCode?: string | null;
  errorMessage?: string | null;
}

export async function deliverSliceNotifications(input: {
  summary: SliceNotificationSummary;
  db: PrismaClient;
  env?: NodeJS.ProcessEnv;
  client?: ResendClientConfig;
  now?: Date;
}): Promise<NotificationReceipt> {
  const env = input.env ?? process.env;
  const config = resolveNotificationConfig(env);
  const queues = await countQueueDepths(input.db);
  const pending = await countPendingModeration(input.db);
  const view = toReceiptView(input.summary, {
    publicUrl: config.publicUrl,
    adminUrl: config.adminUrl,
    queues,
    pending,
  });
  const receipt = renderReceipt(view);
  if (config.disabled) {
    const result: NotificationReceipt = { sent: false, kind: receipt.kind, reason: 'disabled' };
    await recordPipelineNotification({
      pipelineRunId: input.summary.runId,
      kind: receipt.kind,
      receipt: result,
      subject: receipt.subject,
    }, input.db);
    return result;
  }
  if (config.missing) {
    const result: NotificationReceipt = { sent: false, kind: receipt.kind, reason: 'missing_config' };
    await recordPipelineNotification({
      pipelineRunId: input.summary.runId,
      kind: receipt.kind,
      receipt: result,
      subject: receipt.subject,
    }, input.db);
    return result;
  }

  const sendConfig: ResendClientConfig = input.client ?? {
    apiKey: config.apiKey,
    from: config.from,
    to: config.to,
  };
  const delivered = await sendResendEmail(receipt, sendConfig);
  const result: NotificationReceipt = delivered.ok
    ? { sent: true, kind: receipt.kind }
    : { sent: false, kind: receipt.kind, reason: delivered.reason };
  await recordPipelineNotification({
    pipelineRunId: input.summary.runId,
    kind: receipt.kind,
    receipt: result,
    subject: receipt.subject,
    providerMessageId: delivered.providerMessageId,
  }, input.db);

  if (view.mutatedTopics.length > 0) {
    await deliverAutoApprovalSafely({
      view,
      sendConfig,
      pipelineRunId: input.summary.runId,
      db: input.db,
    });
  }

  if (view.topicsPending > 0) {
    await deliverDigestSafely({
      view,
      sendConfig,
      pipelineRunId: input.summary.runId,
      db: input.db,
    });
  }

  return result;
}

async function deliverAutoApprovalSafely(input: {
  view: ReceiptView;
  sendConfig: ResendClientConfig;
  pipelineRunId: string | null;
  db: PrismaClient;
}): Promise<void> {
  const notice = renderAutoApprovalNotice(input.view);
  try {
    const noticeSend = await sendResendEmail(notice, input.sendConfig);
    await recordPipelineNotification({
      pipelineRunId: input.pipelineRunId,
      kind: notice.kind,
      receipt: noticeSend.ok
        ? { sent: true, kind: notice.kind }
        : { sent: false, kind: notice.kind, reason: noticeSend.reason },
      subject: notice.subject,
      providerMessageId: noticeSend.providerMessageId,
    }, input.db);
  } catch {
    await recordPipelineNotification({
      pipelineRunId: input.pipelineRunId,
      kind: notice.kind,
      receipt: { sent: false, kind: notice.kind, reason: 'network' },
      subject: notice.subject,
    }, input.db).catch(() => undefined);
  }
}

async function deliverDigestSafely(input: {
  view: ReceiptView;
  sendConfig: ResendClientConfig;
  pipelineRunId: string | null;
  db: PrismaClient;
}): Promise<void> {
  const digest = renderModerationDigest(input.view);
  try {
    const digestSend = await sendResendEmail(digest, input.sendConfig);
    await recordPipelineNotification({
      pipelineRunId: input.pipelineRunId,
      kind: digest.kind,
      receipt: digestSend.ok
        ? { sent: true, kind: digest.kind }
        : { sent: false, kind: digest.kind, reason: digestSend.reason },
      subject: digest.subject,
      providerMessageId: digestSend.providerMessageId,
    }, input.db);
  } catch {
    await recordPipelineNotification({
      pipelineRunId: input.pipelineRunId,
      kind: digest.kind,
      receipt: { sent: false, kind: digest.kind, reason: 'network' },
      subject: digest.subject,
    }, input.db).catch(() => undefined);
  }
}

function toReceiptView(
  summary: SliceNotificationSummary,
  options: {
    publicUrl: string;
    adminUrl: string;
    queues: { pending: number; inProgress: number; failed: number };
    pending: { topicsPending: number; questionsPending: number };
  },
): ReceiptView {
  const tavily = stageMetrics(summary, 'tavily_trends');
  const priority = stageMetrics(summary, 'tavily_priority');
  const extraction = stageMetrics(summary, 'article_extraction');
  const topics = stageMetrics(summary, 'topic_discovery');
  const questions = stageMetrics(summary, 'question_discovery');
  const validation = stageMetrics(summary, 'question_validation');
  const classification = stageMetrics(summary, 'stance_classification');
  const verdicts = stageMetrics(summary, 'verdict_recalculation');
  const generation = stageMetrics(summary, 'content_generation');
  const moderation = stageMetrics(summary, 'finalize');
  return {
    runId: summary.runId ?? 'unknown',
    trigger: summary.trigger ?? 'manual',
    status: String(summary.status),
    publicUrl: options.publicUrl,
    adminUrl: options.adminUrl,
    tavilySearches: numberMetric(tavily, ['searches']),
    matchedTopics: numberMetric(priority, ['matchedTopics', 'matched']),
    topicsDiscovered: numberMetric(topics, ['discovered', 'processed']),
    topicsAutoApproved: mutatedTopicsFrom(moderation).length,
    mutatedTopics: mutatedTopicsFrom(moderation),
    topicsPending: options.pending.topicsPending,
    questionsDiscovered: numberMetric(questions, ['discovered', 'processed']),
    questionsValidated: numberMetric(validation, ['validated', 'processed']),
    questionsPending: options.pending.questionsPending,
    articlesDiscovered: numberMetric(extraction, ['discovered', 'claimed']),
    articlesExtracted: numberMetric(extraction, ['extracted', 'stored', 'processed']),
    articlesFailed: numberMetric(extraction, ['failed']),
    articlesWaiting: options.queues.pending,
    classificationsAttempted: numberMetric(classification, ['attempted', 'processed']),
    classificationsStored: numberMetric(classification, ['stored', 'processed']),
    classificationsSkipped: numberMetric(classification, ['skipped']),
    verdictsRecalculated: numberMetric(verdicts, ['recalculated', 'processed']),
    contentGenerated: numberMetric(generation, ['generated', 'processed']),
    queuePending: options.queues.pending,
    queueInProgress: options.queues.inProgress,
    queueFailed: options.queues.failed,
    estimatedCostUsd: summary.ledger.estimatedCostUsd,
    remainingUsd: summary.budget.remainingUsd,
    ceilingUsd: summary.budget.ceilingUsd,
    errorCode: summary.errorCode,
    errorMessage: summary.errorMessage,
    anotherSliceRequired: summary.backlogRemaining,
  };
}

function stageMetrics(summary: SliceNotificationSummary, stage: string): Record<string, unknown> {
  const row = summary.stages.find((item) => item.stage === stage);
  if (!row || !row.metrics || typeof row.metrics !== 'object') {
    return {};
  }
  return row.metrics as Record<string, unknown>;
}

function mutatedTopicsFrom(metrics: Record<string, unknown>): Array<{ id: string; name: string }> {
  const nested = metrics.moderation && typeof metrics.moderation === 'object'
    ? metrics.moderation as Record<string, unknown>
    : metrics;
  const value = nested.mutatedTopics;
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < value.length; i += 1) {
    const row = value[i] as { id?: unknown; name?: unknown };
    if (typeof row?.id === 'string' && typeof row?.name === 'string') {
      rows.push({ id: row.id, name: row.name });
    }
  }
  return rows;
}

function numberMetric(metrics: Record<string, unknown>, keys: string[]): number {
  for (let index = 0; index < keys.length; index += 1) {
    const value = metrics[keys[index]];
    if (typeof value === 'number') {
      return value;
    }
  }
  const nested = metrics.moderation;
  if (nested && typeof nested === 'object') {
    for (let index = 0; index < keys.length; index += 1) {
      const value = (nested as Record<string, unknown>)[keys[index]];
      if (typeof value === 'number') {
        return value;
      }
    }
  }
  return 0;
}
