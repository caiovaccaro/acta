import type { PrismaClient } from '@prisma/client';
import { formatMicrosAsUsd, LEDGER_ZERO, parseDecimalToMicros } from '../../../core/src/llm/usageLedger';
import { evaluateSoak, type SoakDayMetrics, type SoakReport } from '../../../core/src/operations/soak';

export async function loadSoakReport(input: {
  db: PrismaClient;
  now?: Date;
}): Promise<SoakReport> {
  const runs = await input.db.pipelineRun.findMany({
    where: { trigger: 'scheduled' },
    orderBy: { createdAt: 'asc' },
    include: {
      llmUsages: { select: { estimatedCostUsd: true } },
      notifications: { select: { status: true, kind: true } },
    },
  });
  const days: SoakDayMetrics[] = [];
  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];
    const stamp = run.finishedAt ?? run.createdAt;
    let cost = LEDGER_ZERO;
    for (let j = 0; j < run.llmUsages.length; j += 1) {
      cost += parseDecimalToMicros(run.llmUsages[j].estimatedCostUsd.toFixed(6));
    }
    const recovered = run.status === 'completed';
    days.push({
      day: stamp.toISOString().slice(0, 10),
      runId: run.id,
      status: run.status,
      finishedAt: stamp.toISOString(),
      estimatedCostUsd: formatMicrosAsUsd(cost),
      receiptSent: run.notifications.some((row) => row.status === 'accepted'),
      recovered,
    });
  }
  return evaluateSoak({ days, now: input.now ?? new Date() });
}
