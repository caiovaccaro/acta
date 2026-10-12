export type NotificationKind =
  | 'success'
  | 'pause'
  | 'failure'
  | 'budget'
  | 'moderation_digest';

export type NotificationDeliveryReason =
  | 'missing_config'
  | 'rejected'
  | 'timeout'
  | 'network'
  | 'disabled';

export interface NotificationReceipt {
  sent: boolean;
  kind?: NotificationKind;
  reason?: NotificationDeliveryReason;
}

export interface ReceiptView {
  runId: string;
  trigger: string;
  status: string;
  startedAt?: string;
  durationMs?: number;
  publicUrl: string;
  adminUrl: string;
  tavilySearches: number;
  matchedTopics: number;
  topicsDiscovered: number;
  topicsAutoApproved: number;
  topicsPending: number;
  questionsDiscovered: number;
  questionsValidated: number;
  questionsPending: number;
  articlesDiscovered: number;
  articlesExtracted: number;
  articlesFailed: number;
  articlesWaiting: number;
  classificationsAttempted: number;
  classificationsStored: number;
  classificationsSkipped: number;
  verdictsRecalculated: number;
  contentGenerated: number;
  queuePending: number;
  queueInProgress: number;
  queueFailed: number;
  estimatedCostUsd: string;
  remainingUsd: string;
  ceilingUsd: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  anotherSliceRequired: boolean;
}

export interface RenderedNotification {
  kind: NotificationKind;
  subject: string;
  text: string;
}
