import { describe, expect, it } from '@jest/globals';
import { mapOperationalHealth, redactHealthError } from '../../operations/health';

const now = new Date('2026-10-12T12:00:00.000Z');

describe('operational health mapping', () => {
  it('hides operational data when unauthorized', () => {
    const mapped = mapOperationalHealth({
      authorized: false,
      now,
      lastRun: { status: 'completed', heartbeatAt: now, finishedAt: now },
      queues: { pending: 4, inProgress: 1, failed: 0 },
      budget: { remainingUsd: '10.000000', ceilingUsd: '30.000000' },
    });
    expect(mapped.authorized).toBe(false);
    expect(mapped.overall).toBe('unauthorized');
    expect(mapped.queues.pending).toBeUndefined();
    expect(mapped.budget.remainingUsd).toBeUndefined();
  });

  it('marks stale heartbeats and freshness and unknown on internal errors', () => {
    const stale = mapOperationalHealth({
      authorized: true,
      now,
      lastRun: {
        status: 'running',
        heartbeatAt: new Date('2026-10-12T11:00:00.000Z'),
        finishedAt: new Date('2026-10-09T12:00:00.000Z'),
      },
      queues: { pending: 2, inProgress: 0, failed: 1 },
      moderation: { topicsPending: 3, questionsPending: 1 },
      budget: { remainingUsd: '5.000000', ceilingUsd: '30.000000' },
    });
    expect(stale.run.status).toBe('stale');
    expect(stale.freshness.status).toBe('stale');
    expect(stale.queues).toMatchObject({ pending: 2, failed: 1 });
    expect(stale.moderation.topicsPending).toBe(3);
    expect(stale.budget.status).toBe('ok');

    const broken = mapOperationalHealth({
      authorized: true,
      now,
      errors: { run: true, queues: true, moderation: true, budget: true },
    });
    expect(broken.run.status).toBe('unknown');
    expect(broken.queues.status).toBe('unknown');
    expect(broken.budget.status).toBe('unknown');
    expect(broken.overall).toBe('unknown');
    expect(redactHealthError()).toBe('internal_error');
    expect(redactHealthError()).not.toContain('password');
  });
});
