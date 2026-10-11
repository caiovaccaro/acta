import { PrismaClient } from '@prisma/client';
import { runBoundedStageUnits } from '../../pipeline/stageUnit';

const mode = process.argv[2];
const db = new PrismaClient();

try {
  let last = { exhausted: false, cursor: null as unknown };
  while (!last.exhausted) {
    const [state] = await db.$queryRaw<Array<{ cursor: unknown }>>`
      SELECT "cursor" FROM "pipeline_cursor_resume_state" WHERE "id" = 'stage'
    `;
    const rows = await db.$queryRaw<Array<{ id: string; createdAt: Date }>>`
      SELECT "id", "createdAt" FROM "pipeline_cursor_resume_items"
      ORDER BY "createdAt" ASC, "id" ASC
    `;
    const result = await runBoundedStageUnits({
      records: rows,
      cursor: state?.cursor,
      unitLimit: 2,
      processUnit: async (record) => {
        await db.$executeRaw`
          INSERT INTO "pipeline_cursor_resume_writes" ("id")
          VALUES (${record.id})
        `;
      },
    });
    await db.$executeRaw`
      UPDATE "pipeline_cursor_resume_state"
      SET "cursor" = ${JSON.stringify(result.cursor)}::jsonb
      WHERE "id" = 'stage'
    `;
    last = { exhausted: result.exhausted, cursor: result.cursor };
    if (mode === 'interrupt' && result.processedIds.length > 0) {
      process.stdout.write(`${JSON.stringify({ interrupted: true, cursor: result.cursor })}\n`);
      process.exit(0);
    }
    if (result.processedIds.length === 0) break;
  }
  process.stdout.write(`${JSON.stringify({ done: last.exhausted, cursor: last.cursor })}\n`);
} finally {
  await db.$disconnect();
}
