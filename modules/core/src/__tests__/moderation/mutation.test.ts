import { describe, expect, it } from '@jest/globals';
import {
  applyMutationDecision,
  evaluateTopicPolicy,
  isAutoApproveTopicsEnabled,
  shouldMutateTopic,
  type TopicPolicyInput,
} from '../../moderation/policy';

function ready(partial: Partial<TopicPolicyInput> = {}): TopicPolicyInput {
  return {
    id: 'topic-ready',
    name: 'AI regulation',
    description: 'Oversight of frontier model deployment.',
    confidence: 0.8,
    articles: [
      { id: 'a1', outletId: 'o1' },
      { id: 'a2', outletId: 'o2' },
      { id: 'a3', outletId: 'o1' },
    ],
    tavily: [
      { id: 't1', domain: 'news.example.com', title: 'AI regulation talks' },
      { id: 't2', domain: 'policy.example.org', title: 'AI regulation bill' },
      { id: 't3', domain: 'news.example.com', title: 'AI regulation vote' },
    ],
    approvedTopicNames: ['Climate policy'],
    remainingUsd: '1.000000',
    ...partial,
  };
}

describe('Level 1 auto-approval mutation gate', () => {
  it('mutates only when the flag is true and every condition passed', () => {
    const eligible = evaluateTopicPolicy(ready());
    expect(isAutoApproveTopicsEnabled({})).toBe(false);
    expect(isAutoApproveTopicsEnabled({ AUTO_APPROVE_TOPICS: 'false' })).toBe(false);
    expect(isAutoApproveTopicsEnabled({ AUTO_APPROVE_TOPICS: 'true' })).toBe(true);
    expect(shouldMutateTopic(eligible, false)).toBe(false);
    expect(shouldMutateTopic(eligible, true)).toBe(true);
    expect(applyMutationDecision(eligible, false)).toMatchObject({
      mutateStatus: false,
      mode: 'shadow',
      decision: 'propose_approve',
    });
    expect(applyMutationDecision(eligible, true)).toMatchObject({
      mutateStatus: true,
      mode: 'live',
      decision: 'approved',
    });
  });

  it('disables future mutations when the flag is rolled back', () => {
    const ineligible = evaluateTopicPolicy(ready({ confidence: 0.1 }));
    expect(shouldMutateTopic(ineligible, true)).toBe(false);
    expect(applyMutationDecision(ineligible, true).mutateStatus).toBe(false);
    expect(applyMutationDecision(evaluateTopicPolicy(ready()), false).mutateStatus).toBe(false);
  });
});
