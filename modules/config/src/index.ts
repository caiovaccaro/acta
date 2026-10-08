import { z } from 'zod';

const runtimeEnvSchema = z.object({
  DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional(),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
});

const disallowedPlaceholders = new Set([
  'change-me',
  'changeme',
  'change-this-to-a-long-random-string',
  'password',
  'secret',
]);

const productionEnvSchema = z.object({
  NODE_ENV: z.literal('production', {
    errorMap: () => ({ message: 'must equal production' }),
  }),
  DATABASE_URL: z
    .string({ required_error: 'is required' })
    .url('must be a valid URL')
    .refine((value) => {
      try {
        return ['postgres:', 'postgresql:'].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, 'must use the postgresql protocol'),
  ADMIN_EMAIL: z
    .string({ required_error: 'is required' })
    .email('must be a valid email address'),
  ADMIN_PASSWORD: z
    .string({ required_error: 'is required' })
    .min(16, 'must contain at least 16 characters')
    .refine(
      (value) => !disallowedPlaceholders.has(value.trim().toLowerCase()),
      'must not use a placeholder value',
    ),
  ADMIN_SESSION_SECRET: z
    .string({ required_error: 'is required' })
    .min(32, 'must contain at least 32 characters')
    .refine(
      (value) => !disallowedPlaceholders.has(value.trim().toLowerCase()),
      'must not use a placeholder value',
    ),
});

export type RuntimeEnvironment = z.infer<typeof runtimeEnvSchema>;
export type ProductionEnvironment = z.infer<typeof productionEnvSchema>;

export interface ProductionConfigIssue {
  variable: keyof ProductionEnvironment;
  constraint: string;
}

export type ProductionConfigResult =
  | { success: true; data: ProductionEnvironment; issues: [] }
  | { success: false; issues: ProductionConfigIssue[] };

export function parseEnvironment(
  environment: NodeJS.ProcessEnv,
): RuntimeEnvironment {
  return runtimeEnvSchema.parse(environment);
}

export function getConfig(): RuntimeEnvironment {
  return parseEnvironment(process.env);
}

export function getDbConfig(environment = process.env) {
  const config = parseEnvironment(environment);
  return {
    url: config.DATABASE_URL,
    pool: {
      min: 2,
      max: 10,
    },
  };
}

export function validateProductionEnvironment(
  environment: NodeJS.ProcessEnv,
): ProductionConfigResult {
  const result = productionEnvSchema.safeParse(environment);
  if (result.success) {
    return { success: true, data: result.data, issues: [] };
  }

  const issues = result.error.issues.map((issue) => ({
    variable: issue.path[0] as keyof ProductionEnvironment,
    constraint: issue.message,
  }));
  return { success: false, issues };
}

export function formatProductionConfigIssues(
  issues: ProductionConfigIssue[],
): string {
  return [
    'Invalid production configuration:',
    ...issues.map(({ variable, constraint }) => `- ${variable}: ${constraint}`),
  ].join('\n');
}

export type Config = RuntimeEnvironment;

