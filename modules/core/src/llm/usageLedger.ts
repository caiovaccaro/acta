/**
 * Fixed-precision LLM usage mapping for the audit ledger.
 * Never include prompts, completions, API keys, or article text.
 */

export const LLM_USAGE_LEDGER_FIELDS = [
  'operation',
  'provider',
  'model',
  'promptTokens',
  'completionTokens',
  'estimatedCostUsd',
  'providerRequestId',
  'pipelineRunId',
  'stage',
] as const;

export type LlmUsageLedgerField = (typeof LLM_USAGE_LEDGER_FIELDS)[number];

export interface LlmUsageLedgerRecord {
  operation: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: string;
  providerRequestId: string | null;
  pipelineRunId: string | null;
  stage: string | null;
}

export type LlmUsageSink = (record: LlmUsageLedgerRecord) => Promise<void>;

export interface LlmUsageContext {
  pipelineRunId?: string | null;
  stage?: string | null;
}

const MICROS_SCALE = 6;
export const LEDGER_ZERO = BigInt(0);
export const LEDGER_ONE = BigInt(1);
export const LEDGER_TWO = BigInt(2);
export const MICROS_PER_USD = BigInt(1000000);
const FORBIDDEN_LEDGER_KEYS = [
  'prompt',
  'prompts',
  'completion',
  'completions',
  'messages',
  'content',
  'textContent',
  'articleText',
  'apiKey',
  'key',
] as const;

export function parseDecimalToMicros(value: string | number): bigint {
  const raw = typeof value === 'number' ? formatFiniteNumber(value) : value.trim();
  if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) {
    throw new Error('Cost values must be finite decimals');
  }
  const negative = raw.startsWith('-');
  const unsigned = negative ? raw.slice(1) : raw;
  const [whole, fraction = ''] = unsigned.split('.');
  const padded = `${fraction}0000000`;
  const kept = padded.slice(0, MICROS_SCALE);
  const nextDigit = padded.slice(MICROS_SCALE, MICROS_SCALE + 1);
  let micros = BigInt(whole || '0') * MICROS_PER_USD + BigInt(kept || '0');
  if (nextDigit !== '' && Number(nextDigit) >= 5) {
    micros += LEDGER_ONE;
  }
  return negative ? -micros : micros;
}

export function formatMicrosAsUsd(micros: bigint): string {
  const negative = micros < LEDGER_ZERO;
  const absolute = negative ? -micros : micros;
  const whole = absolute / MICROS_PER_USD;
  const fraction = (absolute % MICROS_PER_USD).toString().padStart(MICROS_SCALE, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

export function estimateCostUsd(input: {
  promptTokens: number;
  completionTokens: number;
  pricePerMillionInput: number;
  pricePerMillionOutput: number;
}): string {
  const prompt = asNonNegativeInt(input.promptTokens, 'promptTokens');
  const completion = asNonNegativeInt(input.completionTokens, 'completionTokens');
  const inputMicros = mulDivRoundHalfUp(
    BigInt(prompt),
    parseDecimalToMicros(input.pricePerMillionInput),
    MICROS_PER_USD,
  );
  const outputMicros = mulDivRoundHalfUp(
    BigInt(completion),
    parseDecimalToMicros(input.pricePerMillionOutput),
    MICROS_PER_USD,
  );
  return formatMicrosAsUsd(inputMicros + outputMicros);
}

export function mapProviderUsage(input: {
  operation: string;
  provider: string;
  model: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  providerRequestId?: string | null;
  pipelineRunId?: string | null;
  stage?: string | null;
  pricePerMillionInput: number;
  pricePerMillionOutput: number;
}): LlmUsageLedgerRecord {
  const record: LlmUsageLedgerRecord = {
    operation: input.operation,
    provider: input.provider,
    model: input.model,
    promptTokens: asNonNegativeInt(input.promptTokens ?? 0, 'promptTokens'),
    completionTokens: asNonNegativeInt(input.completionTokens ?? 0, 'completionTokens'),
    estimatedCostUsd: estimateCostUsd({
      promptTokens: input.promptTokens ?? 0,
      completionTokens: input.completionTokens ?? 0,
      pricePerMillionInput: input.pricePerMillionInput,
      pricePerMillionOutput: input.pricePerMillionOutput,
    }),
    providerRequestId: input.providerRequestId ?? null,
    pipelineRunId: input.pipelineRunId ?? null,
    stage: input.stage ?? null,
  };
  assertRedactedLedgerRecord(record);
  return record;
}

export function assertRedactedLedgerRecord(record: LlmUsageLedgerRecord): void {
  const keys = Object.keys(record);
  for (const key of keys) {
    if (!(LLM_USAGE_LEDGER_FIELDS as readonly string[]).includes(key)) {
      throw new Error(`Ledger record contains unexpected field: ${key}`);
    }
    if ((FORBIDDEN_LEDGER_KEYS as readonly string[]).includes(key)) {
      throw new Error(`Ledger record contains forbidden field: ${key}`);
    }
  }
  const serialized = JSON.stringify(record);
  for (const forbidden of ['sk-', 'apiKey', 'textContent']) {
    if (serialized.includes(forbidden)) {
      throw new Error('Ledger record must not store secrets or article text');
    }
  }
}

export function sumEstimatedCostUsd(values: readonly string[]): string {
  let total = LEDGER_ZERO;
  for (const value of values) {
    total += parseDecimalToMicros(value);
  }
  return formatMicrosAsUsd(total);
}

function mulDivRoundHalfUp(left: bigint, right: bigint, divisor: bigint): bigint {
  const product = left * right;
  const quotient = product / divisor;
  const remainder = product % divisor;
  if (remainder * LEDGER_TWO >= divisor) {
    return quotient + LEDGER_ONE;
  }
  return quotient;
}

function asNonNegativeInt(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function formatFiniteNumber(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error('Cost values must be finite decimals');
  }
  return value.toLocaleString('en-US', {
    useGrouping: false,
    maximumFractionDigits: 20,
  });
}
