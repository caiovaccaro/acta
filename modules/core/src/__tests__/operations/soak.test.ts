import { describe, expect, it } from '@jest/globals';
import {
  evaluateSoak,
  MONTHLY_OPERATING_CEILING_USD,
  projectMonthlyUsd,
  STEADY_STATE_CONFIG,
  type SoakDayMetrics,
} from '../../operations/soak';

function day(overrides: Partial<SoakDayMetrics> & { day: string }): SoakDayMetrics {
  return {
    runId: `run-${overrides.day}`,
    status: 'completed',
    finishedAt: `${overrides.day}T12:00:00.000Z`,
    estimatedCostUsd: '0.100000',
    receiptSent: true,
    recovered: false,
    ...overrides,
  };
}

describe('soak report validation', () => {
  const now = new Date('2026-10-12T12:00:00.000Z');

  it('projects monthly cost and passes a clean seven-day fixture', () => {
    expect(projectMonthlyUsd('0.700000')).toBe('3.000000');
    const days = ['05', '06', '07', '08', '09', '10', '11'].map((part) => day({
      day: `2026-10-${part}`,
    }));
    const report = evaluateSoak({ days, now });
    expect(report.countedDays).toHaveLength(7);
    expect(report.freshness.status).toBe('pass');
    expect(report.reliability.status).toBe('pass');
    expect(report.email.status).toBe('pass');
    expect(report.cost.status).toBe('pass');
    expect(report.cost.ceilingUsd).toBe(MONTHLY_OPERATING_CEILING_USD);
    expect(report.recommendation).toBe('steady');
    expect(report.steadyStateConfig).toEqual(STEADY_STATE_CONFIG);
    expect(report.steadyStateConfig.autoApproveTopics).toBe(false);
  });

  it('fails unrecovered errors, stale freshness, missing receipts, and over-budget projection', () => {
    const failed = evaluateSoak({
      days: [
        day({ day: '2026-10-05', status: 'failed_terminal', recovered: false, receiptSent: false }),
        day({ day: '2026-10-06' }),
      ],
      now,
    });
    expect(failed.reliability.status).toBe('fail');
    expect(failed.recommendation).toBe('restart-soak');

    const stale = evaluateSoak({
      days: ['01', '02', '03', '04', '05', '06', '07'].map((part) => day({
        day: `2026-09-${part}`,
        finishedAt: `2026-09-${part}T12:00:00.000Z`,
      })),
      now,
    });
    expect(stale.freshness.status).toBe('fail');

    const overBudget = evaluateSoak({
      days: ['05', '06', '07', '08', '09', '10', '11'].map((part) => day({
        day: `2026-10-${part}`,
        estimatedCostUsd: '20.000000',
      })),
      now,
    });
    expect(overBudget.cost.status).toBe('fail');
    expect(overBudget.reason).toBe('projected_monthly_cost_exceeds_ceiling');
  });
});
