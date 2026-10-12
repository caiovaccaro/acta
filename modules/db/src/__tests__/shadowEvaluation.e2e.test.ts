import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { persistModerationDecision } from '../repositories/moderationPolicyRepository';
import { buildShadowEvaluationReport } from '../pipeline/shadowEvaluation';
import { DEFAULT_TOPIC_POLICY_THRESHOLDS, MODERATION_POLICY_VERSION } from '../../../core/src/moderation/policy';

const describeDatabase = process.env.RUN_SHADOW_EVAL_E2E_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('seven successful fixture daily shadow runs', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.moderationPolicyDecision.deleteMany();
    await db.pipelineLeaseEvent.deleteMany();
    await db.pipelineLease.deleteMany();
    await db.pipelineStageRun.deleteMany();
    await db.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it('emits a go recommendation with default thresholds and zero false approvals', async () => {
    const labels: Array<{ decisionId: string; label: 'approve' | 'hold' }> = [];
    for (let day = 1; day <= 7; day += 1) {
      const stamp = new Date(`2026-10-0${day}T12:00:00.000Z`);
      const run = await db.pipelineRun.create({
        data: {
          trigger: 'scheduled',
          status: 'completed',
          finishedAt: stamp,
          createdAt: stamp,
        },
      });
      const decisionId = await persistModerationDecision({
        pipelineRunId: run.id,
        decision: {
          subjectType: 'topic',
          subjectId: `topic-${day}`,
          policyVersion: MODERATION_POLICY_VERSION,
          mode: 'shadow',
          decision: day === 7 ? 'pending' : 'propose_approve',
          mutateStatus: false,
          conditions: [
            {
              id: 'supporting_articles',
              passed: day !== 7,
              evidenceIds: [`article-${day}`],
              reason: day === 7 ? 'below_threshold' : 'met',
            },
          ],
        },
      }, db);
      labels.push({ decisionId, label: day === 7 ? 'hold' : 'approve' });
    }
    await db.pipelineRun.create({
      data: {
        trigger: 'scheduled',
        status: 'failed_terminal',
        finishedAt: new Date('2026-10-08T12:00:00.000Z'),
      },
    });

    const report = await buildShadowEvaluationReport({ db, labels });
    expect(report.countedDays).toHaveLength(7);
    expect(report.falseApprovals).toBe(0);
    expect(report.falseHolds).toBe(0);
    expect(report.recommendation).toBe('go');
    expect(report.proposedThresholds).toEqual(DEFAULT_TOPIC_POLICY_THRESHOLDS);
    expect(report.thresholdNotes).toMatch(/Keep default Level 1 thresholds/);
  });
});
