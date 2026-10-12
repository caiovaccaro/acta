import { formatMicrosAsUsd, parseDecimalToMicros } from './usageLedger';

export const APPLICATION_LLM_MONTHLY_CEILING_USD = '30.000000';

export const RESERVATION_ESTIMATES_USD = {
  classification: '0.050000',
  validation: '0.040000',
  topic_discovery: '0.150000',
  question_discovery: '0.150000',
  generation: '0.200000',
  default: '0.100000',
} as const;

export type ReservationEstimateKind = keyof typeof RESERVATION_ESTIMATES_USD;

const CLASSIFICATION_OPERATIONS = new Set([
  'classifyStance',
  'batchClassifyStances',
]);
const VALIDATION_OPERATIONS = new Set([
  'validateQuestion',
  'validateBarQuestion',
]);
const GENERATION_OPERATIONS = new Set([
  'generateQuestionContextBlurb',
  'generateTimelineEvents',
  'generateOverviewBullets',
  'generateFeaturedPerspective',
  'extractQuotes',
  'summarizeVerdict',
]);

export function utcMonthKey(now: Date): string {
  return now.toISOString().slice(0, 7);
}

export function reservationKindForOperation(operation: string): ReservationEstimateKind {
  if (CLASSIFICATION_OPERATIONS.has(operation)) {
    return 'classification';
  }
  if (VALIDATION_OPERATIONS.has(operation)) {
    return 'validation';
  }
  if (operation === 'discoverTopicsFromArticles') {
    return 'topic_discovery';
  }
  if (operation === 'discoverQuestionsFromArticles') {
    return 'question_discovery';
  }
  if (GENERATION_OPERATIONS.has(operation) || operation.startsWith('generate')) {
    return 'generation';
  }
  return 'default';
}

export function reservationEstimateForOperation(operation: string): string {
  return RESERVATION_ESTIMATES_USD[reservationKindForOperation(operation)];
}

export function resolveMonthlyCeilingUsd(raw?: string | null): string {
  if (raw == null || raw.trim() === '') {
    return APPLICATION_LLM_MONTHLY_CEILING_USD;
  }
  const requested = parseDecimalToMicros(raw);
  if (requested <= 0n) {
    throw new Error('Monthly LLM ceiling must be positive');
  }
  const cap = parseDecimalToMicros(APPLICATION_LLM_MONTHLY_CEILING_USD);
  return formatMicrosAsUsd(requested > cap ? cap : requested);
}

export function remainingBudgetUsd(input: {
  ceilingUsd: string;
  settledUsd: string;
  reservedUsd: string;
}): string {
  const remaining = parseDecimalToMicros(input.ceilingUsd)
    - parseDecimalToMicros(input.settledUsd)
    - parseDecimalToMicros(input.reservedUsd);
  return formatMicrosAsUsd(remaining < 0n ? 0n : remaining);
}

export function canReserve(input: {
  ceilingUsd: string;
  settledUsd: string;
  reservedUsd: string;
  requestedUsd: string;
}): boolean {
  const committed = parseDecimalToMicros(input.settledUsd) + parseDecimalToMicros(input.reservedUsd);
  return committed + parseDecimalToMicros(input.requestedUsd)
    <= parseDecimalToMicros(input.ceilingUsd);
}
