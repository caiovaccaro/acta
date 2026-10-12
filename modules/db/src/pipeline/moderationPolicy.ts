import type { PrismaClient } from '@prisma/client';
import { remainingMonthlyBudget } from '../repositories/llmBudgetRepository';
import { evaluatePendingTopicsShadow } from '../repositories/moderationPolicyRepository';
import { resolveMonthlyCeilingUsd } from '../../../core/src/llm/budget';
import type { StageAdapter, StageOutcome } from './sliceAdapters';

export function createShadowModerationAdapter(options: {
  db: PrismaClient;
  env?: NodeJS.ProcessEnv;
}): StageAdapter {
  return {
    stage: 'finalize',
    async run(context): Promise<StageOutcome> {
      const env = options.env ?? process.env;
      const remaining = await remainingMonthlyBudget({
        ceilingUsd: resolveMonthlyCeilingUsd(env.ACTA_LLM_MONTHLY_CEILING_USD),
      }, options.db);
      const result = await evaluatePendingTopicsShadow({
        db: options.db,
        pipelineRunId: context.runId,
        remainingUsd: remaining.remainingUsd,
        env,
      });
      await context.heartbeat();
      return {
        kind: 'completed',
        metrics: {
          moderation: {
            mode: result.mutated ? 'live' : 'shadow',
            policyVersion: result.decisions[0]?.policyVersion ?? 'acta-moderation-policy/v1',
            proposed: result.decisions.filter((row) => row.decision === 'propose_approve' || row.decision === 'approved').length,
            pending: result.decisions.filter((row) => row.decision === 'pending').length,
            mutated: result.mutated,
            mutatedTopics: result.mutatedTopics,
          },
        },
      };
    },
  };
}
