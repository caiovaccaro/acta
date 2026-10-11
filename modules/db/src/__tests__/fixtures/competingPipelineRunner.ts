import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { acquirePipelineLease } from '../../repositories/pipelineLeaseRepository';

const startAt = Number(process.argv[2]);
if (!Number.isFinite(startAt)) {
  throw new Error('A numeric start timestamp is required');
}

const db = new PrismaClient();

try {
  const run = await db.pipelineRun.create({ data: { trigger: 'manual' } });
  await delay(Math.max(0, startAt - Date.now()));

  const result = await acquirePipelineLease(
    {
      resource: 'e2e-protected-operation',
      ownerToken: randomUUID(),
      pipelineRunId: run.id,
      leaseMs: 60_000,
    },
    db,
  );

  if (result.acquired) {
    await db.$executeRaw`
      INSERT INTO "pipeline_e2e_mutations" ("runId") VALUES (${run.id})
    `;
  }

  process.stdout.write(`${JSON.stringify({ acquired: result.acquired })}\n`);
} finally {
  await db.$disconnect();
}
