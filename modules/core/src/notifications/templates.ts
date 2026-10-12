import { assertRedactedNotification, redactNotificationText } from './redact';
import type { NotificationKind, ReceiptView, RenderedNotification } from './types';

export const TEST_PIPELINE_EMAIL_FROM = 'Acta Pipeline <pipeline@example.invalid>';
export const TEST_PIPELINE_EMAIL_TO = 'owner@example.invalid';
export const TEST_PUBLIC_URL = 'https://acta.example.invalid';
export const TEST_ADMIN_URL = 'https://acta.example.invalid/admin/topics';

export function kindForStatus(status: string): NotificationKind {
  if (status === 'paused_budget') {
    return 'budget';
  }
  if (status === 'paused_deadline' || status === 'blocked_moderation') {
    return 'pause';
  }
  if (status === 'failed_terminal' || status === 'failed_recoverable') {
    return 'failure';
  }
  return 'success';
}

export function renderReceipt(view: ReceiptView): RenderedNotification {
  const kind = kindForStatus(view.status);
  const subject = redactNotificationText(subjectFor(kind, view));
  const text = redactNotificationText(bodyFor(kind, view));
  const rendered = { kind, subject, text };
  assertRedactedNotification(rendered);
  return rendered;
}

export function renderAutoApprovalNotice(view: ReceiptView): RenderedNotification {
  const names: string[] = [];
  for (let i = 0; i < view.mutatedTopics.length; i += 1) {
    names.push(`${view.mutatedTopics[i].name} (${view.mutatedTopics[i].id})`);
  }
  const subject = redactNotificationText(
    `[Acta] Auto-approved ${view.mutatedTopics.length} topic(s)`,
  );
  const text = redactNotificationText([
    `Run ${view.runId} automatically approved ${view.mutatedTopics.length} topic(s).`,
    names.length > 0 ? `Mutations: ${names.join('; ')}` : 'Mutations: none',
    `Production: ${view.publicUrl}`,
    `Admin moderation: ${view.adminUrl}`,
    'Disable AUTO_APPROVE_TOPICS to stop future mutations. Audit history is retained.',
  ].join('\n'));
  const rendered: RenderedNotification = { kind: 'auto_approval', subject, text };
  assertRedactedNotification(rendered);
  return rendered;
}

export function renderModerationDigest(view: ReceiptView): RenderedNotification {
  const subject = redactNotificationText(
    `[Acta] Moderation digest: ${view.topicsPending} topics pending`,
  );
  const text = redactNotificationText([
    `Run ${view.runId} left ${view.topicsPending} topics and ${view.questionsPending} questions pending.`,
    `Production: ${view.publicUrl}`,
    `Admin moderation: ${view.adminUrl}`,
    'Review pending items in admin. This digest does not mutate moderation status.',
  ].join('\n'));
  const rendered: RenderedNotification = { kind: 'moderation_digest', subject, text };
  assertRedactedNotification(rendered);
  return rendered;
}

function subjectFor(kind: NotificationKind, view: ReceiptView): string {
  if (kind === 'budget') {
    return '[Acta] Pipeline paused: monthly LLM budget reached';
  }
  if (kind === 'pause') {
    return `[Acta] Pipeline paused: ${view.errorCode ?? view.status}`;
  }
  if (kind === 'failure') {
    return `[Acta] Pipeline failed: ${view.errorCode ?? 'terminal error'}`;
  }
  return `[Acta] Pipeline completed: ${view.articlesExtracted} articles, ${view.verdictsRecalculated} verdicts updated`;
}

function bodyFor(kind: NotificationKind, view: ReceiptView): string {
  const lines = [
    `Run ID: ${view.runId}`,
    `Trigger: ${view.trigger}`,
    `Status: ${view.status}`,
    `Kind: ${kind}`,
    view.startedAt ? `Started: ${view.startedAt}` : null,
    typeof view.durationMs === 'number' ? `Duration ms: ${view.durationMs}` : null,
    `Production: ${view.publicUrl}`,
    `Admin moderation: ${view.adminUrl}`,
    `Tavily searches: ${view.tavilySearches}`,
    `Matched topics: ${view.matchedTopics}`,
    `Topics discovered/auto-approved/pending: ${view.topicsDiscovered}/${view.topicsAutoApproved}/${view.topicsPending}`,
    `Questions discovered/validated/pending: ${view.questionsDiscovered}/${view.questionsValidated}/${view.questionsPending}`,
    `Articles discovered/extracted/failed/waiting: ${view.articlesDiscovered}/${view.articlesExtracted}/${view.articlesFailed}/${view.articlesWaiting}`,
    `Classifications attempted/stored/skipped: ${view.classificationsAttempted}/${view.classificationsStored}/${view.classificationsSkipped}`,
    `Verdicts recalculated: ${view.verdictsRecalculated}`,
    `Content generated: ${view.contentGenerated}`,
    `Queues pending/in-progress/failed: ${view.queuePending}/${view.queueInProgress}/${view.queueFailed}`,
    `Estimated LLM cost this run: ${view.estimatedCostUsd}`,
    `Remaining application budget: ${view.remainingUsd} of ${view.ceilingUsd}`,
    view.errorCode ? `Error: ${view.errorCode}` : null,
    view.errorMessage ? `Detail: ${view.errorMessage}` : null,
    `Another slice required: ${view.anotherSliceRequired ? 'yes' : 'no'}`,
  ];
  const kept: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line) {
      kept.push(line);
    }
  }
  return kept.join('\n');
}
