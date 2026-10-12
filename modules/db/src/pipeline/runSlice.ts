import { randomUUID } from 'node:crypto';
import type { PipelineRunStatus, Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../index';
import {
  acquirePipelineLease,
  heartbeatPipelineLease,
  releasePipelineLease,
  type LeaseIdentity,
} from '../repositories/pipelineLeaseRepository';
import { remainingMonthlyBudget } from '../repositories/llmBudgetRepository';
import { sumLlmUsageForRun } from '../repositories/llmUsageRepository';
import {
  createPipelineRun,
  findResumablePipelineRun,
  heartbeatPipelineRun,
  transitionPipelineRun,
  upsertPipelineStageRun,
} from '../repositories/pipelineRunRepository';
import { shouldStopClaiming } from './deadline';
import { sanitizePipelineError } from './sanitizeError';
import {
  createDefaultStageAdapters,
  type StageAdapterMap,
  type StageOutcome,
} from './sliceAdapters';
import { createTavilyTrendsAdapter } from './tavilyTrends';
import {
  createPriorityAnalysisAdapter,
  createPriorityExtractionAdapter,
  createTavilyPriorityAdapter,
} from './tavilyPriority';
import { createShadowModerationAdapter } from './moderationPolicy';
import { effectiveStageCap, type EffectiveCap } from '../../../core/src/tavily/priority';
import {
  parseSliceConfig,
  resolveLeaseMs,
  resolvePipelineResource,
  SliceConfigurationError,
  type SliceConfig,
} from './sliceConfig';
import { evaluateSliceAction, isSuccessfulSliceStatus } from './sliceDecision';
import {
  isPaidLlmStage,
  isPipelineStageName,
  PIPELINE_STAGES,
  type PipelineStageName,
} from './sliceStages';
import { APPLICATION_LLM_MONTHLY_CEILING_USD, resolveMonthlyCeilingUsd } from '../../../core/src/llm/budget';
import { LLMBudgetExceededError } from '../../../core/src/llm/errors';

export interface SliceSummary {
  runId: string | null;
  status: PipelineRunStatus | 'lease_not_acquired';
  trigger: SliceConfig['trigger'] | null;
  stages: Array<{
    stage: string;
    status: string;
    cursor: unknown;
    metrics: unknown;
    errorCode?: string | null;
    errorMessage?: string | null;
  }>;
  backlogRemaining: boolean;
  budget: {
    enforced: true;
    ceilingUsd: string;
    remainingUsd: string;
    paused: boolean;
  };
  ledger: { estimatedCostUsd: string; requestCount: number };
  caps: {
    newArticles: EffectiveCap;
    analysisArticles: EffectiveCap;
  };
  receipt: { sent: false; reason: 'email_out_of_scope' };
  errorCode?: string | null;
  errorMessage?: string | null;
}

export interface SliceResult {
  summary: SliceSummary;
  exitCode: 0 | 1;
}

export interface RunSliceOptions {
  argv: readonly string[];
  env?: NodeJS.ProcessEnv;
  db?: PrismaClient;
  adapters?: StageAdapterMap;
  now?: Date;
  ownerToken?: string;
  resource?: string;
  leaseMs?: number;
  reserveMs?: number;
  interruptAfterStage?: PipelineStageName;
}

function emptySummary(status: SliceSummary['status'], error?: {
  errorCode?: string | null;
  errorMessage?: string | null;
}): SliceSummary {
  return {
    runId: null,
    status,
    trigger: null,
    stages: [],
    backlogRemaining: false,
    budget: {
      enforced: true,
      ceilingUsd: APPLICATION_LLM_MONTHLY_CEILING_USD,
      remainingUsd: APPLICATION_LLM_MONTHLY_CEILING_USD,
      paused: false,
    },
    ledger: { estimatedCostUsd: '0.000000', requestCount: 0 },
    caps: {
      newArticles: { configured: 0, budgetDerived: 0, effective: 0, skippedDueToBudget: 0 },
      analysisArticles: { configured: 0, budgetDerived: 0, effective: 0, skippedDueToBudget: 0 },
    },
    receipt: { sent: false, reason: 'email_out_of_scope' },
    ...error,
  };
}

function firstIncompleteStage(
  stageRuns: Array<{ stage: string; status: string }>,
): PipelineStageName {
  for (const stage of PIPELINE_STAGES) {
    const existing = stageRuns.find((row) => row.stage === stage);
    if (!existing || existing.status !== 'completed') {
      return stage;
    }
  }
  return PIPELINE_STAGES[PIPELINE_STAGES.length - 1];
}

export async function runPipelineSlice(options: RunSliceOptions): Promise<SliceResult> {
  const env = options.env ?? process.env;
  let config: SliceConfig;
  try {
    config = parseSliceConfig(options.argv, env);
  } catch (error) {
    const sanitized = sanitizePipelineError(
      'INVALID_CONFIGURATION',
      error instanceof Error ? error.message : 'Invalid configuration',
    );
    return {
      summary: emptySummary('failed_terminal', sanitized),
      exitCode: 1,
    };
  }

  const db = options.db ?? prisma;
  const now = options.now ?? new Date();
  const deadlineAt = new Date(now.getTime() + config.maxRuntimeMinutes * 60 * 1000);
  const adapters = options.adapters ?? {
    ...createDefaultStageAdapters(),
    tavily_trends: createTavilyTrendsAdapter({ db, client: { apiKey: env.TAVILY_API_KEY } }),
    tavily_priority: createTavilyPriorityAdapter({ db }),
    article_extraction: createPriorityExtractionAdapter({ db }),
    stance_classification: createPriorityAnalysisAdapter({ db }),
    finalize: createShadowModerationAdapter({ db, env }),
  };
  const resource = options.resource ?? resolvePipelineResource(env);
  const leaseMs = options.leaseMs ?? resolveLeaseMs(env);
  const ownerToken = options.ownerToken ?? randomUUID();
  const interruptAfter = options.interruptAfterStage ?? (
    env.PIPELINE_INTERRUPT_AFTER && isPipelineStageName(env.PIPELINE_INTERRUPT_AFTER)
      ? env.PIPELINE_INTERRUPT_AFTER
      : undefined
  );

  const existing = await findResumablePipelineRun(db, now);
  const run = existing ?? await createPipelineRun({
    trigger: config.trigger,
    deadlineAt,
    summary: { budget: { enforced: true } },
  }, db);

  const acquired = await acquirePipelineLease({
    resource,
    ownerToken,
    pipelineRunId: run.id,
    leaseMs,
  }, db);

  if (!acquired.acquired) {
    return {
      summary: {
        ...emptySummary('lease_not_acquired', {
          errorCode: 'LEASE_NOT_ACQUIRED',
          errorMessage: 'Another healthy owner holds the pipeline lease',
        }),
        runId: run.id,
        trigger: config.trigger,
      },
      exitCode: 0,
    };
  }

  const identity: LeaseIdentity = {
    resource,
    ownerToken,
    pipelineRunId: run.id,
    generation: acquired.lease.generation,
  };

  await db.pipelineRun.update({
    where: { id: run.id },
    data: { deadlineAt },
  });

  const pulse = async (): Promise<boolean> => {
    const leaseOk = await heartbeatPipelineLease(identity, leaseMs, db);
    if (!leaseOk) {
      return false;
    }
    await heartbeatPipelineRun(run.id, db);
    return true;
  };

  try {
    if (run.status !== 'running') {
      await transitionPipelineRun(run.id, run.status, 'running', {
        heartbeatAt: now,
      }, db);
    }

    if (!(await pulse())) {
      const sanitized = sanitizePipelineError('LEASE_LOST', 'Lease heartbeat failed after acquire');
      return {
        summary: {
          ...emptySummary('failed_recoverable', sanitized),
          runId: run.id,
          trigger: config.trigger,
        },
        exitCode: 0,
      };
    }

    let backlogRemaining = false;
    let budgetPaused = false;
    const stageRows = existing?.stageRuns ?? [];
    let currentStage = firstIncompleteStage(stageRows);
    const ceilingUsd = resolveMonthlyCeilingUsd(env.ACTA_LLM_MONTHLY_CEILING_USD);
    const remaining = await remainingMonthlyBudget({ ceilingUsd }, db).catch(() => ({
      ceilingUsd,
      remainingUsd: ceilingUsd,
      settledUsd: '0.000000',
      reservedUsd: '0.000000',
    }));
    const sliceCaps = {
      newArticles: effectiveStageCap(config.maxNewArticles, remaining.remainingUsd),
      analysisArticles: effectiveStageCap(config.maxAnalysisArticles, remaining.remainingUsd),
    };

    while (currentStage) {
      const decision = evaluateSliceAction({
        configValid: true,
        heartbeatOk: true,
        deadlineStop: shouldStopClaiming(deadlineAt, new Date(), options.reserveMs),
        currentStage,
      });
      if (decision.action !== 'continue') {
        return finishSlice({
          db,
          identity,
          runId: run.id,
          from: 'running',
          decisionStatus: decision.runStatus,
          trigger: config.trigger,
          backlogRemaining,
          caps: sliceCaps,
          errorCode: decision.errorCode,
          errorMessage: decision.errorCode,
        });
      }

      const existingStage = stageRows.find((row) => row.stage === currentStage);
      const started = await upsertPipelineStageRun(run.id, currentStage, {
        status: 'running',
        heartbeatAt: new Date(),
        cursor: existingStage?.cursor as Prisma.InputJsonValue | undefined,
      }, db);
      await db.pipelineStageRun.update({
        where: { id: started.id },
        data: { attempts: { increment: 1 }, startedAt: started.startedAt ?? new Date() },
      });

      const adapter = adapters[currentStage];
      let outcome: StageOutcome;
      try {
        if (budgetPaused && isPaidLlmStage(currentStage)) {
          outcome = {
            kind: 'completed',
            metrics: { skipped: true, reason: 'paused_budget' },
          };
        } else {
          outcome = await adapter.run({
            runId: run.id,
            stage: currentStage,
            cursor: started.cursor,
            deadlineAt,
            limits: {
              maxNewArticles: sliceCaps.newArticles.effective,
              maxAnalysisArticles: sliceCaps.analysisArticles.effective,
            },
            heartbeat: async () => {
              if (!(await pulse())) {
                throw new Error('LEASE_LOST');
              }
            },
            checkpoint: async (cursor, metrics) => {
              await upsertPipelineStageRun(run.id, currentStage, {
                status: 'running',
                cursor: cursor as Prisma.InputJsonValue,
                metrics,
                heartbeatAt: new Date(),
              }, db);
              if (!(await pulse())) {
                throw new Error('LEASE_LOST');
              }
            },
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'SliceInterruptedError') {
          throw error;
        }
        if (error instanceof LLMBudgetExceededError) {
          budgetPaused = true;
          outcome = {
            kind: 'paused_budget',
            errorCode: 'PAUSED_BUDGET',
            errorMessage: error.message,
          };
        } else {
          const lost = error instanceof Error && error.message === 'LEASE_LOST';
          outcome = {
            kind: 'failed_recoverable',
            errorCode: lost ? 'LEASE_LOST' : 'STAGE_EXCEPTION',
            errorMessage: error instanceof Error ? error.message : 'Stage failed',
          };
        }
      }

      if (interruptAfter === currentStage && outcome.kind === 'completed') {
        const error = new Error('SLICE_INTERRUPTED');
        error.name = 'SliceInterruptedError';
        throw error;
      }

      backlogRemaining = backlogRemaining || Boolean(outcome.backlogRemaining);
      if (outcome.kind === 'paused_budget') {
        budgetPaused = true;
      }
      const stageStatus = outcome.kind === 'blocked_moderation'
        ? 'completed'
        : outcome.kind === 'completed' || (outcome.kind === 'paused_budget' && budgetPaused)
          ? (outcome.kind === 'paused_budget' ? 'paused_budget' : 'completed')
          : outcome.kind;
      await upsertPipelineStageRun(run.id, currentStage, {
        status: stageStatus,
        cursor: outcome.cursor ?? undefined,
        metrics: outcome.metrics,
        heartbeatAt: new Date(),
        errorCode: outcome.errorCode ?? null,
        errorMessage: outcome.errorMessage ?? null,
      }, db);

      if (!(await pulse())) {
        return finishSlice({
          db,
          identity,
          runId: run.id,
          from: 'running',
          decisionStatus: 'failed_recoverable',
          trigger: config.trigger,
          backlogRemaining,
          caps: sliceCaps,
          errorCode: 'LEASE_LOST',
          errorMessage: 'Lease lost after checkpoint',
        });
      }

      const after = evaluateSliceAction({
        configValid: true,
        heartbeatOk: true,
        deadlineStop: shouldStopClaiming(deadlineAt, new Date(), options.reserveMs),
        currentStage,
        stageOutcome: outcome.kind === 'paused_budget' ? 'completed' : outcome.kind,
      });

      if (after.action === 'continue' && after.nextStage) {
        currentStage = after.nextStage;
        continue;
      }

      return finishSlice({
        db,
        identity,
        runId: run.id,
        from: 'running',
        decisionStatus: budgetPaused ? 'paused_budget' : after.runStatus,
        trigger: config.trigger,
        backlogRemaining,
        caps: sliceCaps,
        errorCode: budgetPaused ? 'PAUSED_BUDGET' : after.errorCode,
        errorMessage: outcome.errorMessage ?? (budgetPaused ? 'PAUSED_BUDGET' : after.errorCode),
        env,
      });
    }

    return finishSlice({
      db,
      identity,
      runId: run.id,
      from: 'running',
      decisionStatus: budgetPaused ? 'paused_budget' : 'completed',
      trigger: config.trigger,
      backlogRemaining,
      caps: sliceCaps,
      errorCode: budgetPaused ? 'PAUSED_BUDGET' : undefined,
      env,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'SliceInterruptedError') {
      throw error;
    }
    const sanitized = sanitizePipelineError(
      error instanceof SliceConfigurationError ? 'INVALID_CONFIGURATION' : 'SLICE_EXCEPTION',
      error instanceof Error ? error.message : 'Unrecoverable slice error',
    );
    try {
      await transitionPipelineRun(run.id, 'running', 'failed_terminal', sanitized, db);
    } catch {
      // Compare-and-set may fail if the run already left running.
    }
    await releasePipelineLease(identity, db).catch(() => false);
    return {
      summary: {
        ...emptySummary('failed_terminal', sanitized),
        runId: run.id,
        trigger: config.trigger,
      },
      exitCode: 1,
    };
  }
}

async function finishSlice(input: {
  db: PrismaClient;
  identity: LeaseIdentity;
  runId: string;
  from: PipelineRunStatus;
  decisionStatus: PipelineRunStatus | 'lease_not_acquired';
  trigger: SliceConfig['trigger'];
  backlogRemaining: boolean;
  caps?: SliceSummary['caps'];
  errorCode?: string | null;
  errorMessage?: string | null;
  env?: NodeJS.ProcessEnv;
}): Promise<SliceResult> {
  const stages = await input.db.pipelineStageRun.findMany({
    where: { pipelineRunId: input.runId },
    orderBy: { createdAt: 'asc' },
  });
  const ledger = await sumLlmUsageForRun(input.runId, input.db);
  const ceilingUsd = resolveMonthlyCeilingUsd(
    (input.env ?? process.env).ACTA_LLM_MONTHLY_CEILING_USD,
  );
  const remaining = await remainingMonthlyBudget({
    ceilingUsd,
  }, input.db).catch(() => ({
    ceilingUsd,
    remainingUsd: ceilingUsd,
    settledUsd: '0.000000',
    reservedUsd: '0.000000',
  }));
  const sanitized = sanitizePipelineError(input.errorCode, input.errorMessage);
  const summary: SliceSummary = {
    runId: input.runId,
    status: input.decisionStatus,
    trigger: input.trigger,
    stages: stages.map((stage) => ({
      stage: stage.stage,
      status: stage.status,
      cursor: stage.cursor,
      metrics: stage.metrics,
      errorCode: stage.errorCode,
      errorMessage: stage.errorMessage,
    })),
    backlogRemaining: input.backlogRemaining,
    budget: {
      enforced: true,
      ceilingUsd: remaining.ceilingUsd,
      remainingUsd: remaining.remainingUsd,
      paused: input.decisionStatus === 'paused_budget',
    },
    ledger,
    caps: input.caps ?? {
      newArticles: { configured: 0, budgetDerived: 0, effective: 0, skippedDueToBudget: 0 },
      analysisArticles: { configured: 0, budgetDerived: 0, effective: 0, skippedDueToBudget: 0 },
    },
    receipt: { sent: false, reason: 'email_out_of_scope' },
    ...sanitized,
  };

  if (input.decisionStatus !== 'lease_not_acquired' && input.decisionStatus !== 'running') {
    await transitionPipelineRun(
      input.runId,
      input.from,
      input.decisionStatus,
      {
        heartbeatAt: new Date(),
        summary: summary as unknown as Prisma.InputJsonValue,
        ...sanitized,
      },
      input.db,
    );
  }

  await releasePipelineLease(input.identity, input.db);
  return {
    summary,
    exitCode: isSuccessfulSliceStatus(input.decisionStatus) ? 0 : 1,
  };
}
