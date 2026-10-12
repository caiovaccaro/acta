import { describe, expect, it } from '@jest/globals';
import {
  DEFAULT_TOPIC_POLICY_THRESHOLDS,
  evaluateTopicPolicy,
  MODERATION_POLICY_VERSION,
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

function resultById(input: TopicPolicyInput, id: string) {
  return evaluateTopicPolicy(input).conditions.find((row) => row.id === id);
}

describe('Level 1 moderation policy evaluator', () => {
  it('explains a pass at each threshold and proposes approval without mutation', () => {
    const decision = evaluateTopicPolicy(ready());
    expect(decision.policyVersion).toBe(MODERATION_POLICY_VERSION);
    expect(decision.mode).toBe('shadow');
    expect(decision.mutateStatus).toBe(false);
    expect(decision.decision).toBe('propose_approve');
    expect(decision.conditions).toHaveLength(8);
    expect(decision.conditions.every((row) => row.passed)).toBe(true);
  });

  it('fails each condition below its threshold and keeps the candidate pending', () => {
    expect(resultById(ready({ confidence: 0.79 }), 'discovery_confidence')).toMatchObject({
      passed: false,
      reason: 'below_threshold',
      threshold: DEFAULT_TOPIC_POLICY_THRESHOLDS.minConfidence,
    });
    expect(resultById(ready({ articles: [
      { id: 'a1', outletId: 'o1' },
      { id: 'a2', outletId: 'o2' },
    ] }), 'supporting_articles')?.passed).toBe(false);
    expect(resultById(ready({ articles: [
      { id: 'a1', outletId: 'o1' },
      { id: 'a2', outletId: 'o1' },
      { id: 'a3', outletId: 'o1' },
    ] }), 'supporting_outlets')?.passed).toBe(false);
    expect(resultById(ready({ tavily: [
      { id: 't1', domain: 'news.example.com', title: 'AI regulation talks' },
      { id: 't2', domain: 'news.example.com', title: 'AI regulation bill' },
    ] }), 'tavily_corroboration')?.passed).toBe(false);
    expect(resultById(ready({ approvedTopicNames: ['AI regulation'] }), 'not_near_duplicate')).toMatchObject({
      passed: false,
      reason: 'near_duplicate',
    });
    expect(resultById(ready({ name: 'suicide prevention policy' }), 'not_safety_sensitive')).toMatchObject({
      passed: false,
      reason: 'safety_sensitive',
    });
    expect(resultById(ready({ description: 'too short' }), 'name_description_valid')?.passed).toBe(false);
    expect(resultById(ready({ remainingUsd: '0.040000' }), 'budget_permits')?.passed).toBe(false);
    expect(evaluateTopicPolicy(ready({ confidence: 0.79 })).decision).toBe('pending');
  });

  it('treats missing Tavily or confidence evidence as pending, not an approval', () => {
    const missing = evaluateTopicPolicy(ready({ confidence: null, tavily: [] }));
    expect(missing.conditions.find((row) => row.id === 'discovery_confidence')).toMatchObject({
      passed: false,
      reason: 'missing_evidence',
    });
    expect(missing.conditions.find((row) => row.id === 'tavily_corroboration')).toMatchObject({
      passed: false,
      reason: 'missing_evidence',
    });
    expect(missing.decision).toBe('pending');
  });
});
