import { describe, expect, it } from '@jest/globals';
import {
  formatProductionConfigIssues,
  getDbConfig,
  parseEnvironment,
  validateProductionEnvironment,
} from '../index';

const validProductionEnvironment = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://fixture:fixture@localhost:5432/acta',
  ADMIN_EMAIL: 'admin@example.invalid',
  ADMIN_PASSWORD: 'synthetic-password-123',
  ADMIN_SESSION_SECRET: 'synthetic-session-secret-1234567890',
};

describe('runtime configuration', () => {
  it('parses an explicit environment without reading process.env', () => {
    const parsed = parseEnvironment({
      DATABASE_URL: validProductionEnvironment.DATABASE_URL,
      NODE_ENV: 'test',
    });

    expect(parsed).toEqual({
      DATABASE_URL: validProductionEnvironment.DATABASE_URL,
      NODE_ENV: 'test',
    });
  });

  it('builds database configuration from an explicit environment', () => {
    expect(
      getDbConfig({
        DATABASE_URL: validProductionEnvironment.DATABASE_URL,
        NODE_ENV: 'test',
      }),
    ).toEqual({
      url: validProductionEnvironment.DATABASE_URL,
      pool: { min: 2, max: 10 },
    });
  });
});

describe('production configuration', () => {
  it('accepts a valid synthetic production environment', () => {
    expect(validateProductionEnvironment(validProductionEnvironment)).toEqual({
      success: true,
      data: validProductionEnvironment,
      issues: [],
    });
  });

  it.each([
    ['NODE_ENV', { ...validProductionEnvironment, NODE_ENV: 'test' }],
    ['DATABASE_URL', { ...validProductionEnvironment, DATABASE_URL: 'https://example.invalid' }],
    ['ADMIN_EMAIL', { ...validProductionEnvironment, ADMIN_EMAIL: 'not-an-email' }],
    ['ADMIN_PASSWORD', { ...validProductionEnvironment, ADMIN_PASSWORD: 'short' }],
    [
      'ADMIN_SESSION_SECRET',
      { ...validProductionEnvironment, ADMIN_SESSION_SECRET: 'change-this-to-a-long-random-string' },
    ],
  ])('reports the %s constraint without values', (variable, environment) => {
    const sentinel = String(environment[variable as keyof typeof environment]);
    const result = validateProductionEnvironment(environment);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected production validation to fail');
    const output = formatProductionConfigIssues(result.issues);
    expect(output).toContain(variable);
    expect(output).not.toContain(sentinel);
    expect(JSON.stringify(result.issues)).not.toContain(sentinel);
  });

  it('reports every missing required variable by name', () => {
    const result = validateProductionEnvironment({});

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected production validation to fail');
    expect(result.issues.map(({ variable }) => variable)).toEqual([
      'NODE_ENV',
      'DATABASE_URL',
      'ADMIN_EMAIL',
      'ADMIN_PASSWORD',
      'ADMIN_SESSION_SECRET',
    ]);
  });
});

