import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import {
  acquirePipelineLease,
  heartbeatPipelineLease,
  releasePipelineLease,
} from '../repositories/pipelineLeaseRepository';
import {
  PipelineRunConflictError,
  transitionPipelineRun,
  upsertPipelineStageRun,
} from '../repositories/pipelineRunRepository';

const describeDatabase = process.env.RUN_PIPELINE_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('pipeline lease repository integration', () => {
  const first = new PrismaClient();
  const second = new PrismaClient();

  beforeEach(async () => {
    await first.pipelineLeaseEvent.deleteMany();
    await first.pipelineLease.deleteMany();
    await first.pipelineStageRun.deleteMany();
    await first.pipelineRun.deleteMany();
  });

  afterAll(async () => {
    await Promise.all([first.$disconnect(), second.$disconnect()]);
  });

  it('keeps concurrent acquisition singular', async () => {
    const [runA, runB] = await Promise.all([
      first.pipelineRun.create({ data: { trigger: 'manual' } }),
      first.pipelineRun.create({ data: { trigger: 'manual' } }),
    ]);

    const results = await Promise.all([
      acquirePipelineLease(
        {
          resource: 'production-pipeline',
          ownerToken: 'owner-a',
          pipelineRunId: runA.id,
          leaseMs: 60_000,
        },
        first,
      ),
      acquirePipelineLease(
        {
          resource: 'production-pipeline',
          ownerToken: 'owner-b',
          pipelineRunId: runB.id,
          leaseMs: 60_000,
        },
        second,
      ),
    ]);

    expect(results.filter((result) => result.acquired)).toHaveLength(1);
    const lease = await first.pipelineLease.findUniqueOrThrow({
      where: { resource: 'production-pipeline' },
    });
    expect(lease.ownerToken).toBe(
      results.find((result) => result.acquired)?.lease.ownerToken,
    );
    expect(await first.pipelineLeaseEvent.count()).toBe(1);
  });

  it('guards run compare-and-set transitions and sanitizes stage errors', async () => {
    const run = await first.pipelineRun.create({ data: { trigger: 'manual' } });
    const running = await transitionPipelineRun(
      run.id,
      'queued',
      'running',
      {},
      first,
    );
    expect(running.status).toBe('running');
    await expect(
      transitionPipelineRun(run.id, 'queued', 'running', {}, second),
    ).rejects.toBeInstanceOf(PipelineRunConflictError);

    const secret = 'integration-private-value';
    const stage = await upsertPipelineStageRun(
      run.id,
      'fixture-stage',
      {
        status: 'failed_recoverable',
        cursor: { createdAt: '2026-10-10T00:00:00.000Z', id: 'fixture' },
        errorCode: 'PROVIDER FAILURE',
        errorMessage: `token=${secret}`,
      },
      first,
    );
    expect(stage.errorCode).toBe('PROVIDER_FAILURE');
    expect(stage.errorMessage).toBe('token=[REDACTED]');
    expect(stage.errorMessage).not.toContain(secret);
  });

  it('heartbeats, releases, and re-acquires without dual ownership', async () => {
    const runA = await first.pipelineRun.create({ data: { trigger: 'manual' } });
    const runB = await first.pipelineRun.create({ data: { trigger: 'retry' } });
    const acquired = await acquirePipelineLease(
      {
        resource: 'production-pipeline',
        ownerToken: 'owner-a',
        pipelineRunId: runA.id,
        leaseMs: 60_000,
      },
      first,
    );
    expect(acquired.acquired).toBe(true);
    if (!acquired.acquired) throw new Error('Expected acquisition');

    const identity = {
      resource: acquired.lease.resource,
      ownerToken: 'owner-a',
      pipelineRunId: runA.id,
      generation: acquired.lease.generation,
    };
    expect(await heartbeatPipelineLease(identity, 60_000, first)).toBe(true);
    expect(await releasePipelineLease(identity, first)).toBe(true);

    const reacquired = await acquirePipelineLease(
      {
        resource: 'production-pipeline',
        ownerToken: 'owner-b',
        pipelineRunId: runB.id,
        leaseMs: 60_000,
      },
      second,
    );
    expect(reacquired.acquired).toBe(true);
    expect(reacquired.acquired && reacquired.lease.generation).toBe(
      acquired.lease.generation + 1,
    );
  });

  it('records a stale takeover and rejects the displaced owner', async () => {
    const runA = await first.pipelineRun.create({ data: { trigger: 'manual' } });
    const runB = await first.pipelineRun.create({ data: { trigger: 'retry' } });
    const acquired = await acquirePipelineLease(
      {
        resource: 'production-pipeline',
        ownerToken: 'owner-a',
        pipelineRunId: runA.id,
        leaseMs: 60_000,
      },
      first,
    );
    if (!acquired.acquired) throw new Error('Expected acquisition');

    await first.pipelineLease.update({
      where: { resource: 'production-pipeline' },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });

    const takeover = await acquirePipelineLease(
      {
        resource: 'production-pipeline',
        ownerToken: 'owner-b',
        pipelineRunId: runB.id,
        leaseMs: 60_000,
      },
      second,
    );
    expect(takeover.acquired && takeover.takeover).toBe(true);
    if (!takeover.acquired) throw new Error('Expected takeover');

    const oldIdentity = {
      resource: 'production-pipeline',
      ownerToken: 'owner-a',
      pipelineRunId: runA.id,
      generation: acquired.lease.generation,
    };
    expect(await heartbeatPipelineLease(oldIdentity, 60_000, first)).toBe(false);
    expect(await releasePipelineLease(oldIdentity, first)).toBe(false);

    const event = await first.pipelineLeaseEvent.findFirstOrThrow({
      where: { type: 'stale_takeover' },
    });
    expect(event.pipelineRunId).toBe(runB.id);
    expect(event.displacedPipelineRunId).toBe(runA.id);
    expect(event.displacedOwnerToken).toBe('owner-a');

    expect(
      await heartbeatPipelineLease(
        {
          resource: takeover.lease.resource,
          ownerToken: 'owner-b',
          pipelineRunId: runB.id,
          generation: takeover.lease.generation,
        },
        60_000,
        second,
      ),
    ).toBe(true);
  });
});
