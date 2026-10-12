import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { persistModerationDecision } from '../repositories/moderationPolicyRepository';
import { buildShadowEvaluationReport } from '../pipeline/shadowEvaluation';
import { MODERATION_POLICY_VERSION } from '../../../core/src/moderation/policy';

const describeDatabase = process.env.RUN_SHADOW_EVAL_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('shadow evaluation report integration', () => {
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

  it('traces every included decision to stored evidence and policy version', async () => {
    const run = await db.pipelineRun.create({
      data: {
        trigger: 'scheduled',
        status: 'completed',
        finishedAt: new Date('2026-10-01T12:00:00.000Z'),
      },
    });
    const decisionId = await persistModerationDecision({
      pipelineRunId: run.id,
      decision: {
        subjectType: 'topic',
        subjectId: 'topic-1',
        policyVersion: MODERATION_POLICY_VERSION,
        mode: 'shadow',
        decision: 'propose_approve',
        mutateStatus: false,
        conditions: [
          {
            id: 'supporting_articles',
            passed: true,
            evidenceIds: ['article-1', 'article-2'],
            reason: 'met',
          },
        ],
      },
    }, db);

    const report = await buildShadowEvaluationReport({
      db,
      labels: [{ decisionId, label: 'approve' }],
    });
    const included = report.classified.filter((row) => row.classification !== 'excluded');
    expect(included).toHaveLength(1);
    expect(included[0].policyVersion).toBe(MODERATION_POLICY_VERSION);
    expect(included[0].evidenceIds).toEqual(['article-1', 'article-2']);
    expect(included[0].decisionId).toBe(decisionId);
  });
});
