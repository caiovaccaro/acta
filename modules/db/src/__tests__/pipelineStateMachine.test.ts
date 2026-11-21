import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from '@jest/globals';
import type { PipelineRunStatus } from '@prisma/client';
import {
  assertPipelineRunTransition,
  canTransitionPipelineRun,
  InvalidPipelineRunTransitionError,
  PIPELINE_RUN_STATUSES,
} from '../pipeline/stateMachine';
import { sanitizePipelineError } from '../pipeline/sanitizeError';

const schema = readFileSync(
  path.resolve(process.cwd(), 'prisma/schema.prisma'),
  'utf8',
);

const allowed = new Set([
  'queued->running',
  'running->completed',
  'running->paused_budget',
  'running->paused_deadline',
  'running->blocked_moderation',
  'running->failed_recoverable',
  'running->failed_terminal',
  'paused_budget->running',
  'paused_deadline->running',
  'blocked_moderation->running',
  'failed_recoverable->running',
]);

describe('pipeline run state machine', () => {
  it('allows only declared edges for every source and target pair', () => {
    for (const from of PIPELINE_RUN_STATUSES) {
      for (const to of PIPELINE_RUN_STATUSES) {
        const edge = `${from}->${to}`;
        expect(canTransitionPipelineRun(from, to)).toBe(allowed.has(edge));
        if (allowed.has(edge)) {
          expect(() => assertPipelineRunTransition(from, to)).not.toThrow();
        } else {
          expect(() => assertPipelineRunTransition(from, to)).toThrow(
            InvalidPipelineRunTransitionError,
          );
        }
      }
    }
  });

  it.each<PipelineRunStatus>(['completed', 'failed_terminal'])(
    'keeps %s terminal',
    (status) => {
      expect(
        PIPELINE_RUN_STATUSES.every(
          (target) => !canTransitionPipelineRun(status, target),
        ),
      ).toBe(true);
    },
  );
});

describe('pipeline coordination schema contract', () => {
  it('declares run, stage, lease, and audit models with required indexes', () => {
    expect(schema).toContain('model PipelineRun');
    expect(schema).toContain('model PipelineStageRun');
    expect(schema).toContain('model PipelineLease');
    expect(schema).toContain('model PipelineLeaseEvent');
    expect(schema).toContain('@@unique([pipelineRunId, stage])');
    expect(schema).toContain('@@index([status, nextEligibleAt])');
    expect(schema).toContain('@@index([expiresAt])');
    expect(schema).toContain('@@map("pipeline_lease_events")');
  });
});

describe('pipeline error sanitization', () => {
  it('redacts URL credentials and secret assignments and bounds output', () => {
    const secret = 'sentinel-private-value';
    const result = sanitizePipelineError(
      'BAD CODE\n',
      `postgresql://admin:${secret}@db.invalid/acta token=${secret} ${'x'.repeat(1200)}`,
    );

    expect(result.errorCode).toBe('BAD_CODE_');
    expect(result.errorMessage).not.toContain(secret);
    expect(result.errorMessage).toContain('[REDACTED]');
    expect(result.errorMessage?.length).toBeLessThanOrEqual(1000);
  });

  it('normalizes empty values to null', () => {
    expect(sanitizePipelineError('', '   ')).toEqual({
      errorCode: null,
      errorMessage: null,
    });
  });
});
