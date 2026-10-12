import { DEFAULT_TOPIC_POLICY_THRESHOLDS, type TopicPolicyThresholds } from './policy';

export const FALSE_APPROVAL_TOLERANCE = 0;
export const REQUIRED_SUCCESSFUL_DAYS = 7;

export type HumanLabel = 'approve' | 'hold' | 'ambiguous';
export type RunCompleteness = 'completed' | 'failed' | 'incomplete';
export type Classification =
  | 'true_approve'
  | 'false_approve'
  | 'true_hold'
  | 'false_hold'
  | 'ambiguous'
  | 'excluded';

export interface LabeledShadowDecision {
  day: string;
  runStatus: RunCompleteness;
  decisionId: string;
  policyVersion: string;
  proposed: 'propose_approve' | 'pending';
  label: HumanLabel;
  evidenceIds: string[];
}

export interface ShadowEvaluationReport {
  countedDays: string[];
  excludedDays: string[];
  classified: Array<LabeledShadowDecision & { classification: Classification }>;
  falseApprovals: number;
  falseHolds: number;
  ambiguous: number;
  recommendation: 'go' | 'no-go';
  proposedThresholds: TopicPolicyThresholds;
  thresholdNotes: string;
  reason: string;
}

export function classifyLabeledDecision(row: LabeledShadowDecision): Classification {
  if (row.runStatus !== 'completed') {
    return 'excluded';
  }
  if (!row.policyVersion || row.evidenceIds.length === 0) {
    return 'excluded';
  }
  if (row.label === 'ambiguous') {
    return 'ambiguous';
  }
  if (row.proposed === 'propose_approve' && row.label === 'approve') {
    return 'true_approve';
  }
  if (row.proposed === 'propose_approve' && row.label === 'hold') {
    return 'false_approve';
  }
  if (row.proposed === 'pending' && row.label === 'hold') {
    return 'true_hold';
  }
  return 'false_hold';
}

export function evaluateShadowSample(rows: LabeledShadowDecision[]): ShadowEvaluationReport {
  const classified = rows.map((row) => ({
    ...row,
    classification: classifyLabeledDecision(row),
  }));
  const countedDaySet: Record<string, true> = {};
  const excludedDays: string[] = [];
  for (let i = 0; i < classified.length; i += 1) {
    const row = classified[i];
    if (row.classification === 'excluded') {
      if (excludedDays.indexOf(row.day) === -1) {
        excludedDays.push(row.day);
      }
    } else if (!countedDaySet[row.day]) {
      countedDaySet[row.day] = true;
    }
  }
  const countedDays = Object.keys(countedDaySet).sort();
  let falseApprovals = 0;
  let falseHolds = 0;
  let ambiguous = 0;
  for (let i = 0; i < classified.length; i += 1) {
    if (classified[i].classification === 'false_approve') {
      falseApprovals += 1;
    }
    if (classified[i].classification === 'false_hold') {
      falseHolds += 1;
    }
    if (classified[i].classification === 'ambiguous') {
      ambiguous += 1;
    }
  }

  const enoughDays = countedDays.length >= REQUIRED_SUCCESSFUL_DAYS;
  const withinTolerance = falseApprovals <= FALSE_APPROVAL_TOLERANCE;
  const recommendation = enoughDays && withinTolerance ? 'go' : 'no-go';
  const proposedThresholds = { ...DEFAULT_TOPIC_POLICY_THRESHOLDS };
  const thresholdNotes = recommendation === 'go'
    ? 'Keep default Level 1 thresholds. False holds stay documented and do not block a conservative go.'
    : 'Do not enable mutation. Raise corroboration or confidence thresholds if false approvals appear.';

  let reason = 'seven_successful_days_zero_false_approvals';
  if (!enoughDays) {
    reason = 'insufficient_successful_days';
  } else if (!withinTolerance) {
    reason = 'false_approval_tolerance_exceeded';
  }

  return {
    countedDays,
    excludedDays,
    classified,
    falseApprovals,
    falseHolds,
    ambiguous,
    recommendation,
    proposedThresholds,
    thresholdNotes,
    reason,
  };
}

export function assertTraceable(row: LabeledShadowDecision): boolean {
  return Boolean(row.policyVersion) && row.evidenceIds.length > 0;
}
