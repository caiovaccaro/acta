import { Prisma, type PrismaClient } from '@prisma/client';
import {
  canReserve,
  remainingBudgetUsd,
  reservationEstimateForOperation,
  resolveMonthlyCeilingUsd,
  utcMonthKey,
} from '../../../core/src/llm/budget';
import { LLMBudgetExceededError } from '../../../core/src/llm/errors';
import { formatMicrosAsUsd, LEDGER_ZERO, parseDecimalToMicros } from '../../../core/src/llm/usageLedger';
import { prisma } from '../index';

type BudgetDb = PrismaClient | Prisma.TransactionClient;

const DEFAULT_MAX_RETRIES = 3;

export class LlmBudgetRepositoryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'LlmBudgetRepositoryError';
    this.code = code;
  }
}

function isRetryableTransactionError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2034' || error.code === 'P2002')
  );
}

async function databaseNow(tx: Prisma.TransactionClient): Promise<Date> {
  const [row] = await tx.$queryRaw<Array<{ now: Date }>>`
    SELECT CURRENT_TIMESTAMP AS "now"
  `;
  return row.now;
}

function asUsd(value: Prisma.Decimal | string | number): string {
  if (typeof value === 'string') {
    return formatMicrosAsUsd(parseDecimalToMicros(value));
  }
  if (typeof value === 'number') {
    return formatMicrosAsUsd(parseDecimalToMicros(value));
  }
  return formatMicrosAsUsd(parseDecimalToMicros(value.toFixed(6)));
}

export async function monthSpend(
  month: string,
  db: BudgetDb,
): Promise<{ settledUsd: string; reservedUsd: string }> {
  const rows = await db.llmBudgetReservation.findMany({
    where: {
      month,
      status: { in: ['reserved', 'settled'] },
    },
    select: { status: true, reservedCostUsd: true, actualCostUsd: true },
  });
  let settled = LEDGER_ZERO;
  let reserved = LEDGER_ZERO;
  for (const row of rows) {
    if (row.status === 'settled') {
      settled += parseDecimalToMicros(asUsd(row.actualCostUsd ?? row.reservedCostUsd));
    } else {
      reserved += parseDecimalToMicros(asUsd(row.reservedCostUsd));
    }
  }
  return {
    settledUsd: formatMicrosAsUsd(settled),
    reservedUsd: formatMicrosAsUsd(reserved),
  };
}

export async function expireStaleReservations(
  input: { now?: Date } = {},
  db: BudgetDb = prisma,
): Promise<number> {
  const now = input.now ?? new Date();
  const stale = await db.llmBudgetReservation.findMany({
    where: {
      status: 'reserved',
      expiresAt: { lte: now },
    },
  });
  let expired = 0;
  for (const row of stale) {
    if (row.pipelineRunId) {
      const lease = await db.pipelineLease.findFirst({
        where: {
          pipelineRunId: row.pipelineRunId,
          expiresAt: { gt: now },
        },
      });
      if (lease) {
        continue;
      }
    }
    await db.llmBudgetReservation.update({
      where: { id: row.id },
      data: { status: 'expired', actualCostUsd: new Prisma.Decimal('0.000000') },
    });
    expired += 1;
  }
  return expired;
}

export async function reserveLlmBudget(
  input: {
    operation: string;
    pipelineRunId?: string | null;
    now?: Date;
    expiresAt: Date;
    ceilingUsd?: string;
    reservedCostUsd?: string;
  },
  db: PrismaClient = prisma,
  maxRetries = DEFAULT_MAX_RETRIES,
): Promise<{ id: string; reservedCostUsd: string; month: string }> {
  const ceilingUsd = resolveMonthlyCeilingUsd(input.ceilingUsd);
  const reservedCostUsd = input.reservedCostUsd ?? reservationEstimateForOperation(input.operation);
  const month = utcMonthKey(input.now ?? new Date());

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await db.$transaction(
        async (tx) => {
          await expireStaleReservations({ now: input.now }, tx);
          const spend = await monthSpend(month, tx);
          if (!canReserve({
            ceilingUsd,
            settledUsd: spend.settledUsd,
            reservedUsd: spend.reservedUsd,
            requestedUsd: reservedCostUsd,
          })) {
            throw new LLMBudgetExceededError();
          }
          const row = await tx.llmBudgetReservation.create({
            data: {
              month,
              pipelineRunId: input.pipelineRunId ?? null,
              operation: input.operation,
              reservedCostUsd: new Prisma.Decimal(reservedCostUsd),
              status: 'reserved',
              expiresAt: input.expiresAt,
            },
          });
          return { id: row.id, reservedCostUsd, month };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (error instanceof LLMBudgetExceededError) {
        throw error;
      }
      if (attempt === maxRetries || !isRetryableTransactionError(error)) {
        throw error;
      }
    }
  }
  throw new LlmBudgetRepositoryError('BUDGET_RESERVE_FAILED', 'Could not reserve LLM budget');
}

export async function settleLlmBudget(
  input: {
    reservationId: string;
    actualCostUsd: string;
    outcome: 'settled' | 'expired';
  },
  db: PrismaClient = prisma,
): Promise<void> {
  const actual = formatMicrosAsUsd(parseDecimalToMicros(input.actualCostUsd));
  const updated = await db.llmBudgetReservation.updateMany({
    where: { id: input.reservationId, status: 'reserved' },
    data: {
      status: input.outcome,
      actualCostUsd: new Prisma.Decimal(actual),
    },
  });
  if (updated.count !== 1 && input.outcome === 'settled') {
    throw new LlmBudgetRepositoryError(
      'BUDGET_SETTLE_CONFLICT',
      'Reservation was not in reserved state',
    );
  }
}

export async function remainingMonthlyBudget(
  input: { now?: Date; ceilingUsd?: string } = {},
  db: PrismaClient = prisma,
): Promise<{ ceilingUsd: string; remainingUsd: string; settledUsd: string; reservedUsd: string }> {
  const ceilingUsd = resolveMonthlyCeilingUsd(input.ceilingUsd);
  const month = utcMonthKey(input.now ?? new Date());
  await expireStaleReservations({ now: input.now }, db);
  const spend = await monthSpend(month, db);
  return {
    ceilingUsd,
    remainingUsd: remainingBudgetUsd({
      ceilingUsd,
      settledUsd: spend.settledUsd,
      reservedUsd: spend.reservedUsd,
    }),
    ...spend,
  };
}

export function createLlmBudgetGuard(input: {
  db: PrismaClient;
  pipelineRunId?: string | null;
  ceilingUsd?: string;
  reservationMs: number;
  now?: () => Date;
}) {
  return {
    async reserve(operation: string): Promise<{ reservationId: string }> {
      const now = input.now?.() ?? new Date();
      const reserved = await reserveLlmBudget({
        operation,
        pipelineRunId: input.pipelineRunId,
        now,
        expiresAt: new Date(now.getTime() + input.reservationMs),
        ceilingUsd: input.ceilingUsd,
      }, input.db);
      return { reservationId: reserved.id };
    },
    async settle(payload: {
      reservationId: string;
      actualCostUsd: string;
      outcome: 'settled' | 'expired';
    }): Promise<void> {
      await settleLlmBudget(payload, input.db);
    },
  };
}
