import type { PipelineTrigger } from '@prisma/client';

export const DEFAULT_LEASE_MS = 15 * 60 * 1000;
export const DEFAULT_PIPELINE_RESOURCE = 'production-pipeline';

export class SliceConfigurationError extends Error {
  readonly code = 'INVALID_CONFIGURATION';

  constructor(message: string) {
    super(message);
    this.name = 'SliceConfigurationError';
  }
}

export interface SliceConfig {
  maxRuntimeMinutes: number;
  maxNewArticles: number;
  maxAnalysisArticles: number;
  trigger: PipelineTrigger;
}

function parsePositiveInteger(value: string | undefined, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new SliceConfigurationError(`${name} must be a positive integer`);
  }
  return parsed;
}

export function parseSliceConfig(
  argv: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): SliceConfig {
  const args: Record<string, string> = {};
  for (const token of argv) {
    if (!token.startsWith('--') || !token.includes('=')) {
      throw new SliceConfigurationError(`Unsupported argument: ${token}`);
    }
    const [key, ...valueParts] = token.slice(2).split('=');
    args[key] = valueParts.join('=');
  }

  const trigger = args.trigger;
  if (trigger !== 'scheduled' && trigger !== 'manual' && trigger !== 'retry') {
    throw new SliceConfigurationError('trigger must be scheduled, manual, or retry');
  }
  if (!env.DATABASE_URL) {
    throw new SliceConfigurationError('DATABASE_URL is required');
  }

  return {
    maxRuntimeMinutes: parsePositiveInteger(args['max-runtime-minutes'], 'max-runtime-minutes'),
    maxNewArticles: parsePositiveInteger(args['max-new-articles'], 'max-new-articles'),
    maxAnalysisArticles: parsePositiveInteger(
      args['max-analysis-articles'],
      'max-analysis-articles',
    ),
    trigger,
  };
}

export function resolveLeaseMs(env: NodeJS.ProcessEnv = process.env): number {
  if (env.PIPELINE_LEASE_MS) {
    return parsePositiveInteger(env.PIPELINE_LEASE_MS, 'PIPELINE_LEASE_MS');
  }
  return DEFAULT_LEASE_MS;
}

export function resolvePipelineResource(env: NodeJS.ProcessEnv = process.env): string {
  return env.PIPELINE_LEASE_RESOURCE || DEFAULT_PIPELINE_RESOURCE;
}
