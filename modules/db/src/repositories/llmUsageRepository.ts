import { Prisma, type PrismaClient } from '@prisma/client';
import {
  assertRedactedLedgerRecord,
  formatMicrosAsUsd,
  LEDGER_ZERO,
  parseDecimalToMicros,
  type LlmUsageLedgerRecord,
} from '../../../core/src/llm/usageLedger';
import { prisma } from '../index';

export async function recordLlmUsage(
  record: LlmUsageLedgerRecord,
  db: PrismaClient = prisma,
): Promise<void> {
  assertRedactedLedgerRecord(record);
  await db.llmUsage.create({
    data: {
      pipelineRunId: record.pipelineRunId,
      stage: record.stage,
      operation: record.operation,
      provider: record.provider,
      model: record.model,
      promptTokens: record.promptTokens,
      completionTokens: record.completionTokens,
      estimatedCostUsd: new Prisma.Decimal(record.estimatedCostUsd),
      providerRequestId: record.providerRequestId,
    },
  });
}

export async function sumLlmUsageForRun(
  pipelineRunId: string,
  db: PrismaClient = prisma,
): Promise<{ estimatedCostUsd: string; requestCount: number }> {
  const rows = await db.llmUsage.findMany({
    where: { pipelineRunId },
    select: { estimatedCostUsd: true },
  });
  let micros = LEDGER_ZERO;
  for (const row of rows) {
    micros += parseDecimalToMicros(row.estimatedCostUsd.toFixed(6));
  }
  return {
    estimatedCostUsd: formatMicrosAsUsd(micros),
    requestCount: rows.length,
  };
}

export function createLlmUsageSink(db: PrismaClient = prisma) {
  return async (record: LlmUsageLedgerRecord): Promise<void> => {
    await recordLlmUsage(record, db);
  };
}
