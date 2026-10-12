import { describe, expect, it } from '@jest/globals';
import {
  kindForStatus,
  renderAutoApprovalNotice,
  renderModerationDigest,
  renderReceipt,
  TEST_ADMIN_URL,
  TEST_PUBLIC_URL,
} from '../../notifications/templates';
import type { ReceiptView } from '../../notifications/types';

function view(partial: Partial<ReceiptView> = {}): ReceiptView {
  return {
    runId: 'run-1',
    trigger: 'manual',
    status: 'completed',
    startedAt: '2026-10-12T12:00:00.000Z',
    durationMs: 1200,
    publicUrl: TEST_PUBLIC_URL,
    adminUrl: TEST_ADMIN_URL,
    tavilySearches: 5,
    matchedTopics: 2,
    topicsDiscovered: 1,
    topicsAutoApproved: 0,
    mutatedTopics: [],
    topicsPending: 3,
    questionsDiscovered: 2,
    questionsValidated: 1,
    questionsPending: 1,
    articlesDiscovered: 40,
    articlesExtracted: 31,
    articlesFailed: 2,
    articlesWaiting: 7,
    classificationsAttempted: 10,
    classificationsStored: 8,
    classificationsSkipped: 2,
    verdictsRecalculated: 8,
    contentGenerated: 4,
    queuePending: 12,
    queueInProgress: 1,
    queueFailed: 3,
    estimatedCostUsd: '1.250000',
    remainingUsd: '28.750000',
    ceilingUsd: '30.000000',
    anotherSliceRequired: true,
    ...partial,
  };
}

describe('notification templates', () => {
  it('renders success, pause, budget, moderation, and failure with links and aggregates', () => {
    expect(kindForStatus('completed')).toBe('success');
    const success = renderReceipt(view());
    expect(success.subject).toBe('[Acta] Pipeline completed: 31 articles, 8 verdicts updated');
    expect(success.text).toContain(TEST_PUBLIC_URL);
    expect(success.text).toContain(TEST_ADMIN_URL);
    expect(success.text).toContain('Queues pending/in-progress/failed: 12/1/3');
    expect(success.text).toContain('Remaining application budget: 28.750000 of 30.000000');

    const budget = renderReceipt(view({ status: 'paused_budget' }));
    expect(budget.kind).toBe('budget');
    expect(budget.subject).toBe('[Acta] Pipeline paused: monthly LLM budget reached');

    const pause = renderReceipt(view({ status: 'paused_deadline', errorCode: 'DEADLINE' }));
    expect(pause.kind).toBe('pause');
    expect(pause.subject).toContain('DEADLINE');

    const failure = renderReceipt(view({
      status: 'failed_terminal',
      errorCode: 'stance classification',
    }));
    expect(failure.subject).toBe('[Acta] Pipeline failed: stance classification');

    const digest = renderModerationDigest(view());
    expect(digest.kind).toBe('moderation_digest');
    expect(digest.subject).toBe('[Acta] Moderation digest: 3 topics pending');
    expect(digest.text).toContain(TEST_ADMIN_URL);

    const auto = renderAutoApprovalNotice(view({
      mutatedTopics: [{ id: 'topic-ready', name: 'AI regulation' }],
    }));
    expect(auto.kind).toBe('auto_approval');
    expect(auto.subject).toBe('[Acta] Auto-approved 1 topic(s)');
    expect(auto.text).toContain('AI regulation (topic-ready)');
    expect(auto.text).toContain('Disable AUTO_APPROVE_TOPICS');
  });

  it('redacts secrets and sensitive payload fragments from rendered notifications', () => {
    const rendered = renderReceipt(view({
      errorMessage: 'provider sk-secretvalue OPENAI_API_KEY=sk-live TAVILY_API_KEY=tvly-secret RESEND_API_KEY=re_live PIPELINE_EMAIL_FROM=from PIPELINE_EMAIL_TO=hidden ADMIN_PASSWORD=pw textContent=article',
    }));
    expect(rendered.text).not.toContain('sk-secretvalue');
    expect(rendered.text).not.toContain('re_live');
    expect(rendered.text).not.toContain('tvly-secret');
    expect(rendered.text).not.toContain('PIPELINE_EMAIL_TO');
    expect(rendered.text).not.toContain('PIPELINE_EMAIL_FROM');
    expect(rendered.text).not.toContain('OPENAI_API_KEY');
    expect(rendered.text).not.toContain('TAVILY_API_KEY');
    expect(rendered.text).not.toContain('RESEND_API_KEY');
    expect(rendered.text).not.toContain('ADMIN_PASSWORD');
    expect(rendered.text).not.toContain('textContent');
    expect(rendered.text).toContain('[redacted]');
  });
});
