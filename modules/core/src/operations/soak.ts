import { formatMicrosAsUsd, LEDGER_ZERO, parseDecimalToMicros } from '../llm/usageLedger';
import { STALE_FRESHNESS_MS } from './health';

export const MONTHLY_OPERATING_CEILING_USD = '50.000000';
export const SOAK_REQUIRED_DAYS = 7;
export const SOAK_FRESHNESS_MS = STALE_FRESHNESS_MS;
export const STEADY_STATE_CONFIG = {
  maxRuntimeMinutes: 285,
  maxNewArticles: 20,
  maxAnalysisArticles: 20,
  autoApproveTopics: false,
  llmMonthlyCeilingUsd: '30.000000',
} as const;

export interface SoakDayMetrics {
  day: string;
  runId: string;
  status: string;
  finishedAt: string;
  estimatedCostUsd: string;
  receiptSent: boolean;
  recovered: boolean;
}

export interface SoakReport {
  countedDays: string[];
  freshness: { status: 'pass' | 'fail'; lastFinishedAt?: string; ageMs?: number };
  reliability: { status: 'pass' | 'fail'; unrecoveredFailures: number };
  email: { status: 'pass' | 'fail'; daysMissingReceipt: string[] };
  cost: {
    status: 'pass' | 'fail';
    observedSevenDayUsd: string;
    projectedMonthlyUsd: string;
    ceilingUsd: string;
  };
  recommendation: 'steady' | 'restart-soak';
  reason: string;
  steadyStateConfig: typeof STEADY_STATE_CONFIG;
}

export function projectMonthlyUsd(sevenDayUsd: string): string {
  const sevenDayMicros = parseDecimalToMicros(sevenDayUsd);
  const daily = sevenDayMicros / BigInt(SOAK_REQUIRED_DAYS);
  return formatMicrosAsUsd(daily * BigInt(30));
}

export function evaluateSoak(input: {
  days: SoakDayMetrics[];
  now: Date;
}): SoakReport {
  const unrecoveredFailures = input.days.filter((day) => {
    return (day.status === 'failed_terminal' || day.status === 'failed_recoverable')
      && !day.recovered;
  }).length;
  const completed = input.days.filter((day) => day.status === 'completed' || day.recovered);
  const countedDays = uniqueDays(completed).sort();
  const daysMissingReceipt = countedDays.filter((day) => {
    return !completed.some((row) => row.day === day && row.receiptSent);
  });
  let observedMicros = LEDGER_ZERO;
  for (let i = 0; i < completed.length; i += 1) {
    observedMicros += parseDecimalToMicros(completed[i].estimatedCostUsd);
  }
  const observedSevenDayUsd = formatMicrosAsUsd(observedMicros);
  const projectedMonthlyUsd = projectMonthlyUsd(observedSevenDayUsd);
  const lastFinished = latestFinished(completed);
  const ageMs = lastFinished ? input.now.getTime() - new Date(lastFinished).getTime() : undefined;
  const freshnessPass = typeof ageMs === 'number' && ageMs <= SOAK_FRESHNESS_MS;
  const reliabilityPass = unrecoveredFailures === 0 && countedDays.length >= SOAK_REQUIRED_DAYS;
  const emailPass = daysMissingReceipt.length === 0 && countedDays.length >= SOAK_REQUIRED_DAYS;
  const costPass = parseDecimalToMicros(projectedMonthlyUsd) <= parseDecimalToMicros(MONTHLY_OPERATING_CEILING_USD);
  const recommendation = freshnessPass && reliabilityPass && emailPass && costPass
    ? 'steady'
    : 'restart-soak';
  let reason = 'seven_consecutive_days_within_budget';
  if (!reliabilityPass) {
    reason = unrecoveredFailures > 0 ? 'unrecovered_failure_restart_required' : 'insufficient_successful_days';
  } else if (!freshnessPass) {
    reason = 'freshness_older_than_48h';
  } else if (!emailPass) {
    reason = 'missing_receipts';
  } else if (!costPass) {
    reason = 'projected_monthly_cost_exceeds_ceiling';
  }
  return {
    countedDays,
    freshness: { status: freshnessPass ? 'pass' : 'fail', lastFinishedAt: lastFinished, ageMs },
    reliability: { status: reliabilityPass ? 'pass' : 'fail', unrecoveredFailures },
    email: { status: emailPass ? 'pass' : 'fail', daysMissingReceipt },
    cost: {
      status: costPass ? 'pass' : 'fail',
      observedSevenDayUsd,
      projectedMonthlyUsd,
      ceilingUsd: MONTHLY_OPERATING_CEILING_USD,
    },
    recommendation,
    reason,
    steadyStateConfig: STEADY_STATE_CONFIG,
  };
}

function uniqueDays(rows: SoakDayMetrics[]): string[] {
  const seen: Record<string, true> = {};
  const days: string[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    if (!seen[rows[i].day]) {
      seen[rows[i].day] = true;
      days.push(rows[i].day);
    }
  }
  return days;
}

function latestFinished(rows: SoakDayMetrics[]): string | undefined {
  let latest: string | undefined;
  for (let i = 0; i < rows.length; i += 1) {
    if (!latest || rows[i].finishedAt > latest) {
      latest = rows[i].finishedAt;
    }
  }
  return latest;
}
