import type { PipelineRunStatus } from '@prisma/client';
import {
  nextPipelineStage,
  PIPELINE_STAGES,
  type PipelineStageName,
} from './sliceStages';

export type StageOutcomeKind =
  | 'completed'
  | 'paused_deadline'
  | 'paused_budget'
  | 'blocked_moderation'
  | 'failed_recoverable'
  | 'failed_terminal';

export type SliceDecision =
  | {
    action: 'reject_config';
    runStatus: 'failed_terminal';
    errorCode: 'INVALID_CONFIGURATION';
    nextStage: null;
  }
  | {
    action: 'continue';
    runStatus: 'running';
    nextStage: PipelineStageName;
    errorCode: null;
  }
  | {
    action: 'complete';
    runStatus: 'completed';
    nextStage: null;
    errorCode: null;
  }
  | {
    action: 'pause';
    runStatus: 'paused_deadline' | 'paused_budget' | 'blocked_moderation';
    nextStage: PipelineStageName | null;
    errorCode: string;
  }
  | {
    action: 'fail';
    runStatus: 'failed_recoverable' | 'failed_terminal';
    nextStage: PipelineStageName | null;
    errorCode: string;
  };

export function evaluateSliceAction(input: {
  configValid: boolean;
  heartbeatOk: boolean;
  deadlineStop: boolean;
  currentStage?: PipelineStageName | null;
  stageOutcome?: StageOutcomeKind | null;
}): SliceDecision {
  if (!input.configValid) {
    return {
      action: 'reject_config',
      runStatus: 'failed_terminal',
      errorCode: 'INVALID_CONFIGURATION',
      nextStage: null,
    };
  }

  if (!input.heartbeatOk) {
    return {
      action: 'fail',
      runStatus: 'failed_recoverable',
      nextStage: input.currentStage ?? null,
      errorCode: 'LEASE_LOST',
    };
  }

  if (input.stageOutcome === 'paused_deadline') {
    return {
      action: 'pause',
      runStatus: 'paused_deadline',
      nextStage: input.currentStage ?? null,
      errorCode: 'PAUSED_DEADLINE',
    };
  }
  if (input.stageOutcome === 'paused_budget') {
    return {
      action: 'pause',
      runStatus: 'paused_budget',
      nextStage: input.currentStage ?? null,
      errorCode: 'PAUSED_BUDGET',
    };
  }
  if (input.stageOutcome === 'blocked_moderation') {
    return {
      action: 'pause',
      runStatus: 'blocked_moderation',
      nextStage: input.currentStage ?? null,
      errorCode: 'BLOCKED_MODERATION',
    };
  }
  if (input.stageOutcome === 'failed_recoverable') {
    return {
      action: 'fail',
      runStatus: 'failed_recoverable',
      nextStage: input.currentStage ?? null,
      errorCode: 'STAGE_FAILED_RECOVERABLE',
    };
  }
  if (input.stageOutcome === 'failed_terminal') {
    return {
      action: 'fail',
      runStatus: 'failed_terminal',
      nextStage: input.currentStage ?? null,
      errorCode: 'STAGE_FAILED_TERMINAL',
    };
  }

  if (input.deadlineStop && input.stageOutcome !== 'completed') {
    return {
      action: 'pause',
      runStatus: 'paused_deadline',
      nextStage: input.currentStage ?? PIPELINE_STAGES[0],
      errorCode: 'PAUSED_DEADLINE',
    };
  }

  if (input.stageOutcome === 'completed' && input.currentStage) {
    const next = nextPipelineStage(input.currentStage);
    if (!next) {
      return {
        action: 'complete',
        runStatus: 'completed',
        nextStage: null,
        errorCode: null,
      };
    }
    return {
      action: 'continue',
      runStatus: 'running',
      nextStage: next,
      errorCode: null,
    };
  }

  return {
    action: 'continue',
    runStatus: 'running',
    nextStage: input.currentStage ?? PIPELINE_STAGES[0],
    errorCode: null,
  };
}

export function isSuccessfulSliceStatus(status: PipelineRunStatus | 'lease_not_acquired'): boolean {
  return status !== 'failed_terminal';
}
