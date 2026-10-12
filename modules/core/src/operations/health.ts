export const STALE_HEARTBEAT_MS = 15 * 60 * 1000;
export const STALE_FRESHNESS_MS = 48 * 60 * 60 * 1000;

export type HealthSectionStatus = 'ok' | 'stale' | 'unknown' | 'paused' | 'failed';

export interface OperationalHealth {
  authorized: boolean;
  overall: HealthSectionStatus | 'unauthorized';
  run: {
    status: HealthSectionStatus;
    lastStatus?: string;
    heartbeatAgeMs?: number;
  };
  freshness: { status: HealthSectionStatus; lastFinishedAt?: string };
  queues: {
    status: HealthSectionStatus;
    pending?: number;
    inProgress?: number;
    failed?: number;
  };
  moderation: {
    status: HealthSectionStatus;
    topicsPending?: number;
    questionsPending?: number;
  };
  budget: {
    status: HealthSectionStatus;
    remainingUsd?: string;
    ceilingUsd?: string;
  };
}

export function mapOperationalHealth(input: {
  authorized: boolean;
  now: Date;
  lastRun?: { status: string; heartbeatAt?: Date | null; finishedAt?: Date | null } | null;
  queues?: { pending: number; inProgress: number; failed: number } | null;
  moderation?: { topicsPending: number; questionsPending: number } | null;
  budget?: { remainingUsd: string; ceilingUsd: string } | null;
  errors?: { run?: boolean; queues?: boolean; moderation?: boolean; budget?: boolean };
}): OperationalHealth {
  if (!input.authorized) {
    return {
      authorized: false,
      overall: 'unauthorized',
      run: { status: 'unknown' },
      freshness: { status: 'unknown' },
      queues: { status: 'unknown' },
      moderation: { status: 'unknown' },
      budget: { status: 'unknown' },
    };
  }

  const runSection = mapRun(input.now, input.lastRun, Boolean(input.errors?.run));
  const freshness = mapFreshness(input.now, input.lastRun, Boolean(input.errors?.run));
  const queues = input.errors?.queues || !input.queues
    ? { status: 'unknown' as const }
    : { status: 'ok' as const, ...input.queues };
  const moderation = input.errors?.moderation || !input.moderation
    ? { status: 'unknown' as const }
    : { status: 'ok' as const, ...input.moderation };
  const budget = mapBudget(input.budget, Boolean(input.errors?.budget));
  const overall = worstStatus([
    runSection.status,
    freshness.status,
    queues.status,
    moderation.status,
    budget.status,
  ]);
  return {
    authorized: true,
    overall,
    run: runSection,
    freshness,
    queues,
    moderation,
    budget,
  };
}

function mapRun(
  now: Date,
  lastRun: { status: string; heartbeatAt?: Date | null } | null | undefined,
  failed: boolean,
): OperationalHealth['run'] {
  if (failed) {
    return { status: 'unknown' };
  }
  if (!lastRun) {
    return { status: 'unknown' };
  }
  const heartbeatAgeMs = lastRun.heartbeatAt
    ? now.getTime() - lastRun.heartbeatAt.getTime()
    : undefined;
  if (lastRun.status === 'paused_budget' || lastRun.status === 'paused_deadline') {
    return { status: 'paused', lastStatus: lastRun.status, heartbeatAgeMs };
  }
  if (lastRun.status === 'failed_terminal' || lastRun.status === 'failed_recoverable') {
    return { status: 'failed', lastStatus: lastRun.status, heartbeatAgeMs };
  }
  if (typeof heartbeatAgeMs === 'number' && heartbeatAgeMs > STALE_HEARTBEAT_MS) {
    return { status: 'stale', lastStatus: lastRun.status, heartbeatAgeMs };
  }
  return { status: 'ok', lastStatus: lastRun.status, heartbeatAgeMs };
}

function mapFreshness(
  now: Date,
  lastRun: { finishedAt?: Date | null } | null | undefined,
  failed: boolean,
): OperationalHealth['freshness'] {
  if (failed) {
    return { status: 'unknown' };
  }
  if (!lastRun?.finishedAt) {
    return { status: 'unknown' };
  }
  const age = now.getTime() - lastRun.finishedAt.getTime();
  return {
    status: age > STALE_FRESHNESS_MS ? 'stale' : 'ok',
    lastFinishedAt: lastRun.finishedAt.toISOString(),
  };
}

function mapBudget(
  budget: { remainingUsd: string; ceilingUsd: string } | null | undefined,
  failed: boolean,
): OperationalHealth['budget'] {
  if (failed || !budget) {
    return { status: 'unknown' };
  }
  const remaining = Number(budget.remainingUsd);
  return {
    status: remaining <= 0 ? 'paused' : 'ok',
    remainingUsd: budget.remainingUsd,
    ceilingUsd: budget.ceilingUsd,
  };
}

function worstStatus(values: HealthSectionStatus[]): HealthSectionStatus {
  if (values.indexOf('failed') !== -1) {
    return 'failed';
  }
  if (values.indexOf('paused') !== -1) {
    return 'paused';
  }
  if (values.indexOf('stale') !== -1) {
    return 'stale';
  }
  if (values.indexOf('unknown') !== -1) {
    return 'unknown';
  }
  return 'ok';
}

export function redactHealthError(): string {
  return 'internal_error';
}
