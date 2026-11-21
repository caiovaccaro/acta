import {
  type PipelineRun,
  type PipelineRunStatus,
  type PipelineStageRun,
  type PipelineStageStatus,
  type PipelineTrigger,
  Prisma,
  type PrismaClient,
} from '@prisma/client';
import { prisma } from '../index';
import { assertPipelineRunTransition } from '../pipeline/stateMachine';
import { sanitizePipelineError } from '../pipeline/sanitizeError';

export class PipelineRunConflictError extends Error {
  readonly code = 'PIPELINE_RUN_CONFLICT';

  constructor() {
    super('Pipeline run state changed concurrently');
    this.name = 'PipelineRunConflictError';
  }
}

export interface CreatePipelineRunInput {
  trigger: PipelineTrigger;
  deadlineAt?: Date;
  nextEligibleAt?: Date;
  summary?: Prisma.InputJsonValue;
}

export async function createPipelineRun(
  input: CreatePipelineRunInput,
  db: PrismaClient = prisma,
): Promise<PipelineRun> {
  return db.pipelineRun.create({ data: input });
}

export async function transitionPipelineRun(
  id: string,
  from: PipelineRunStatus,
  to: PipelineRunStatus,
  options: {
    heartbeatAt?: Date;
    nextEligibleAt?: Date | null;
    summary?: Prisma.InputJsonValue;
    errorCode?: string | null;
    errorMessage?: string | null;
  } = {},
  db: PrismaClient = prisma,
): Promise<PipelineRun> {
  assertPipelineRunTransition(from, to);
  const error = sanitizePipelineError(options.errorCode, options.errorMessage);
  const now = new Date();
  const terminal = to === 'completed' || to === 'failed_terminal';

  const result = await db.pipelineRun.updateMany({
    where: { id, status: from },
    data: {
      status: to,
      startedAt: to === 'running' ? now : undefined,
      heartbeatAt: options.heartbeatAt,
      finishedAt: terminal ? now : undefined,
      nextEligibleAt: options.nextEligibleAt,
      summary: options.summary,
      ...error,
    },
  });

  if (result.count !== 1) {
    throw new PipelineRunConflictError();
  }

  return db.pipelineRun.findUniqueOrThrow({ where: { id } });
}

export async function upsertPipelineStageRun(
  pipelineRunId: string,
  stage: string,
  input: {
    status?: PipelineStageStatus;
    cursor?: Prisma.InputJsonValue;
    metrics?: Prisma.InputJsonValue;
    heartbeatAt?: Date;
    errorCode?: string | null;
    errorMessage?: string | null;
  } = {},
  db: PrismaClient = prisma,
): Promise<PipelineStageRun> {
  const error = sanitizePipelineError(input.errorCode, input.errorMessage);
  const data = {
    status: input.status,
    cursor: input.cursor,
    metrics: input.metrics,
    heartbeatAt: input.heartbeatAt,
    ...error,
  };

  return db.pipelineStageRun.upsert({
    where: { pipelineRunId_stage: { pipelineRunId, stage } },
    create: {
      pipelineRunId,
      stage,
      ...data,
    },
    update: data,
  });
}

export async function listPipelineRunsByState(
  statuses: PipelineRunStatus[],
  db: PrismaClient = prisma,
): Promise<PipelineRun[]> {
  return db.pipelineRun.findMany({
    where: { status: { in: statuses } },
    orderBy: [{ nextEligibleAt: 'asc' }, { createdAt: 'asc' }],
  });
}
