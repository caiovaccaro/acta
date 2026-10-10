export class StageUnitLimitError extends Error {
  readonly code = 'STAGE_UNIT_LIMIT_REQUIRED';

  constructor() {
    super('Production stage unit caps are required');
    this.name = 'StageUnitLimitError';
  }
}

export function resolveStageUnitLimit(
  requested: number | undefined,
  env: NodeJS.ProcessEnv = process.env,
): number {
  if (Number.isInteger(requested) && (requested as number) > 0) {
    return requested as number;
  }
  if (env.NODE_ENV === 'production') {
    throw new StageUnitLimitError();
  }
  throw new StageUnitLimitError();
}
