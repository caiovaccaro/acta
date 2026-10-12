import type { PrismaClient } from '@prisma/client';
import {
  assertTraceable,
  evaluateShadowSample,
  type HumanLabel,
  type LabeledShadowDecision,
  type ShadowEvaluationReport,
} from '../../../core/src/moderation/evaluation';

export interface OwnerLabel {
  decisionId: string;
  label: HumanLabel;
}

function evidenceFromConditions(conditions: unknown): string[] {
  if (!Array.isArray(conditions)) {
    return [];
  }
  const ids: string[] = [];
  for (let i = 0; i < conditions.length; i += 1) {
    const row = conditions[i] as { evidenceIds?: unknown };
    if (!Array.isArray(row.evidenceIds)) {
      continue;
    }
    for (let j = 0; j < row.evidenceIds.length; j += 1) {
      if (typeof row.evidenceIds[j] === 'string') {
        ids.push(row.evidenceIds[j]);
      }
    }
  }
  return ids;
}

export async function buildShadowEvaluationReport(input: {
  db: PrismaClient;
  labels: OwnerLabel[];
}): Promise<ShadowEvaluationReport> {
  const stored = await input.db.moderationPolicyDecision.findMany({
    include: { pipelineRun: { select: { status: true, finishedAt: true, createdAt: true } } },
    orderBy: { createdAt: 'asc' },
  });
  const labelById: Record<string, HumanLabel> = {};
  for (let i = 0; i < input.labels.length; i += 1) {
    labelById[input.labels[i].decisionId] = input.labels[i].label;
  }
  const labeled: LabeledShadowDecision[] = [];
  for (let i = 0; i < stored.length; i += 1) {
    const row = stored[i];
    const label = labelById[row.id];
    if (!label) {
      continue;
    }
    const runStatus = row.pipelineRun?.status === 'completed'
      ? 'completed'
      : row.pipelineRun?.status === 'failed_terminal' || row.pipelineRun?.status === 'failed_recoverable'
        ? 'failed'
        : 'incomplete';
    const stamp = row.pipelineRun?.finishedAt ?? row.createdAt;
    const proposed = row.decision === 'propose_approve' ? 'propose_approve' : 'pending';
    labeled.push({
      day: stamp.toISOString().slice(0, 10),
      runStatus,
      decisionId: row.id,
      policyVersion: row.policyVersion,
      proposed,
      label,
      evidenceIds: evidenceFromConditions(row.conditions),
    });
  }
  const included = labeled.filter((row) => assertTraceable(row) || row.runStatus !== 'completed');
  return evaluateShadowSample(included);
}
