import { describe, expect, it } from '@jest/globals';
import { DEFAULT_TOPIC_POLICY_THRESHOLDS } from '../../moderation/policy';
import {
  classifyLabeledDecision,
  evaluateShadowSample,
  type LabeledShadowDecision,
} from '../../moderation/evaluation';

function row(overrides: Partial<LabeledShadowDecision>): LabeledShadowDecision {
  return {
    day: '2026-10-01',
    runStatus: 'completed',
    decisionId: 'd1',
    policyVersion: 'acta-moderation-policy/v1',
    proposed: 'propose_approve',
    label: 'approve',
    evidenceIds: ['ev-1'],
    ...overrides,
  };
}

describe('shadow evaluation metrics', () => {
  it('classifies false approvals, false holds, and excludes failed runs', () => {
    expect(classifyLabeledDecision(row({ proposed: 'propose_approve', label: 'approve' }))).toBe('true_approve');
    expect(classifyLabeledDecision(row({ proposed: 'propose_approve', label: 'hold' }))).toBe('false_approve');
    expect(classifyLabeledDecision(row({ proposed: 'pending', label: 'hold' }))).toBe('true_hold');
    expect(classifyLabeledDecision(row({ proposed: 'pending', label: 'approve' }))).toBe('false_hold');
    expect(classifyLabeledDecision(row({ runStatus: 'failed' }))).toBe('excluded');
    expect(classifyLabeledDecision(row({ label: 'ambiguous' }))).toBe('ambiguous');
  });

  it('is a no-go on any false approval and a go when seven clean days exist', () => {
    const days = ['01', '02', '03', '04', '05', '06', '07'].map((day) => row({
      day: `2026-10-${day}`,
      decisionId: `d-${day}`,
    }));
    const go = evaluateShadowSample([
      ...days,
      row({ day: '2026-10-03', decisionId: 'hold-1', proposed: 'pending', label: 'hold' }),
      row({ day: '2026-10-08', runStatus: 'failed', decisionId: 'failed-1' }),
    ]);
    expect(go.countedDays).toHaveLength(7);
    expect(go.falseApprovals).toBe(0);
    expect(go.falseHolds).toBe(0);
    expect(go.recommendation).toBe('go');
    expect(go.proposedThresholds).toEqual(DEFAULT_TOPIC_POLICY_THRESHOLDS);

    const noGo = evaluateShadowSample([
      ...days,
      row({ day: '2026-10-04', decisionId: 'bad', proposed: 'propose_approve', label: 'hold' }),
    ]);
    expect(noGo.falseApprovals).toBe(1);
    expect(noGo.recommendation).toBe('no-go');
    expect(noGo.reason).toBe('false_approval_tolerance_exceeded');
  });
});
