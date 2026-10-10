import type { PipelineRunStatus } from '@prisma/client';

export class InvalidPipelineRunTransitionError extends Error {
  readonly code = 'INVALID_PIPELINE_RUN_TRANSITION';

  constructor(from: PipelineRunStatus, to: PipelineRunStatus) {
    super(`Pipeline run cannot transition from ${from} to ${to}`);
    this.name = 'InvalidPipelineRunTransitionError';
  }
}

const transitions: Readonly<Record<PipelineRunStatus, readonly PipelineRunStatus[]>> = {
  queued: ['running'],
  running: [
    'completed',
    'paused_budget',
    'paused_deadline',
    'blocked_moderation',
    'failed_recoverable',
    'failed_terminal',
  ],
  completed: [],
  paused_budget: ['running'],
  paused_deadline: ['running'],
  blocked_moderation: ['running'],
  failed_recoverable: ['running'],
  failed_terminal: [],
};

export const PIPELINE_RUN_STATUSES = Object.freeze(
  Object.keys(transitions) as PipelineRunStatus[],
);

export function canTransitionPipelineRun(
  from: PipelineRunStatus,
  to: PipelineRunStatus,
): boolean {
  return transitions[from].includes(to);
}

export function assertPipelineRunTransition(
  from: PipelineRunStatus,
  to: PipelineRunStatus,
): void {
  if (!canTransitionPipelineRun(from, to)) {
    throw new InvalidPipelineRunTransitionError(from, to);
  }
}
