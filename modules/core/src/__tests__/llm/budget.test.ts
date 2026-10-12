import { describe, expect, it } from '@jest/globals';
import {
  APPLICATION_LLM_MONTHLY_CEILING_USD,
  canReserve,
  remainingBudgetUsd,
  reservationEstimateForOperation,
  resolveMonthlyCeilingUsd,
  utcMonthKey,
} from '../../llm/budget';

describe('LLM budget reservations', () => {
  it('uses conservative per-operation estimates', () => {
    expect(reservationEstimateForOperation('classifyStance')).toBe('0.050000');
    expect(reservationEstimateForOperation('validateQuestion')).toBe('0.040000');
    expect(reservationEstimateForOperation('discoverTopicsFromArticles')).toBe('0.150000');
    expect(reservationEstimateForOperation('discoverQuestionsFromArticles')).toBe('0.150000');
    expect(reservationEstimateForOperation('generateOverviewBullets')).toBe('0.200000');
    expect(reservationEstimateForOperation('unknownOp')).toBe('0.100000');
  });

  it('clamps untrusted ceiling raises to USD 30', () => {
    expect(resolveMonthlyCeilingUsd(undefined)).toBe(APPLICATION_LLM_MONTHLY_CEILING_USD);
    expect(resolveMonthlyCeilingUsd('50')).toBe('30.000000');
    expect(resolveMonthlyCeilingUsd('0.050000')).toBe('0.050000');
    expect(() => resolveMonthlyCeilingUsd('0')).toThrow(/positive/);
  });

  it('keeps available budget conservative across precision and month boundaries', () => {
    expect(canReserve({
      ceilingUsd: '30.000000',
      settledUsd: '29.950000',
      reservedUsd: '0.040000',
      requestedUsd: '0.050000',
    })).toBe(false);
    expect(canReserve({
      ceilingUsd: '30.000000',
      settledUsd: '29.950000',
      reservedUsd: '0.000000',
      requestedUsd: '0.050000',
    })).toBe(true);
    expect(remainingBudgetUsd({
      ceilingUsd: '30.000000',
      settledUsd: '10.000000',
      reservedUsd: '0.150000',
    })).toBe('19.850000');
    expect(utcMonthKey(new Date('2026-01-31T23:59:59.000Z'))).toBe('2026-01');
    expect(utcMonthKey(new Date('2026-02-01T00:00:00.000Z'))).toBe('2026-02');
  });
});
