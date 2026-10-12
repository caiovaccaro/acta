import type { Prisma, PrismaClient } from '@prisma/client';
import {
  applyMutationDecision,
  evaluateTopicPolicy,
  isAutoApproveTopicsEnabled,
  resolveTopicPolicyThresholds,
  type TopicPolicyDecision,
} from '../../../core/src/moderation/policy';
import { prisma } from '../index';

type DecisionDb = Pick<PrismaClient, 'moderationPolicyDecision' | 'topic'>;

export function parseTopicConfidence(value: unknown): number | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const confidence = (value as { confidence?: unknown }).confidence;
  return typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : null;
}

export async function persistModerationDecision(
  input: {
    pipelineRunId?: string | null;
    decision: TopicPolicyDecision;
  },
  db: DecisionDb = prisma,
): Promise<string> {
  const row = await db.moderationPolicyDecision.create({
    data: {
      pipelineRunId: input.pipelineRunId ?? null,
      subjectType: input.decision.subjectType,
      subjectId: input.decision.subjectId,
      policyVersion: input.decision.policyVersion,
      mode: input.decision.mode,
      decision: input.decision.decision,
      conditions: input.decision.conditions as unknown as Prisma.InputJsonValue,
    },
  });
  return row.id;
}

export async function evaluatePendingTopicsShadow(options: {
  db: PrismaClient;
  pipelineRunId?: string | null;
  remainingUsd: string;
  env?: NodeJS.ProcessEnv;
}): Promise<{
  decisions: TopicPolicyDecision[];
  mutated: boolean;
  mutatedTopics: Array<{ id: string; name: string }>;
}> {
  const enabled = isAutoApproveTopicsEnabled(options.env);
  const thresholds = resolveTopicPolicyThresholds(options.env);
  const pending = await options.db.topic.findMany({
    where: { moderationStatus: 'pending' },
    include: {
      topicArticles: {
        include: {
          article: { select: { id: true, outletId: true } },
        },
      },
    },
  });
  const approved = await options.db.topic.findMany({
    where: { moderationStatus: 'approved' },
    select: { name: true },
  });
  const signals = await options.db.trendSignal.findMany({
    select: { id: true, domain: true, title: true, matchedTopicId: true },
  });
  const decisions: TopicPolicyDecision[] = [];
  const mutatedTopics: Array<{ id: string; name: string }> = [];
  for (let index = 0; index < pending.length; index += 1) {
    const topic = pending[index];
    const tavily = signals
      .filter((signal) => signal.matchedTopicId === topic.id || signal.title)
      .map((signal) => ({ id: signal.id, domain: signal.domain, title: signal.title }));
    const decision = evaluateTopicPolicy({
      id: topic.id,
      name: topic.name,
      description: topic.description,
      confidence: parseTopicConfidence(topic.discoveredFromArticles),
      articles: topic.topicArticles.map((link) => ({
        id: link.article.id,
        outletId: link.article.outletId,
      })),
      tavily,
      approvedTopicNames: approved.map((row) => row.name),
      remainingUsd: options.remainingUsd,
    }, thresholds);
    const planned = applyMutationDecision(decision, enabled);
    try {
      await options.db.$transaction(async (tx) => {
        await persistModerationDecision({
          pipelineRunId: options.pipelineRunId,
          decision: planned,
        }, tx);
        if (planned.mutateStatus) {
          const updated = await tx.topic.updateMany({
            where: { id: topic.id, moderationStatus: 'pending' },
            data: { moderationStatus: 'approved' },
          });
          if (updated.count !== 1) {
            throw new Error('AUTO_APPROVE_CONFLICT');
          }
        }
      });
      decisions.push(planned);
      if (planned.mutateStatus) {
        mutatedTopics.push({ id: topic.id, name: topic.name });
        approved.push({ name: topic.name });
      }
    } catch {
      await persistModerationDecision({
        pipelineRunId: options.pipelineRunId,
        decision,
      }, options.db);
      decisions.push(decision);
    }
  }
  return {
    decisions,
    mutated: mutatedTopics.length > 0,
    mutatedTopics,
  };
}
