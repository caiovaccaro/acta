import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { decodeStageCursor } from '../pipeline/cursor';
import { runBoundedStageUnits } from '../pipeline/stageUnit';

const describeDatabase = process.env.RUN_PIPELINE_CURSOR_DB_TESTS === '1'
  ? describe
  : describe.skip;

describeDatabase('stable cursor integration', () => {
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pipeline_cursor_items" (
        "id" TEXT PRIMARY KEY,
        "createdAt" TIMESTAMP(3) NOT NULL,
        "committed" BOOLEAN NOT NULL DEFAULT FALSE
      )
    `);
    await db.$executeRawUnsafe('TRUNCATE TABLE "pipeline_cursor_items"');
    const stamp = new Date('2026-10-10T12:00:00.000Z');
    await db.$executeRaw`
      INSERT INTO "pipeline_cursor_items" ("id", "createdAt")
      VALUES
        ('item-a', ${stamp}),
        ('item-b', ${stamp}),
        ('item-c', ${new Date('2026-10-10T12:00:01.000Z')}),
        ('item-d', ${new Date('2026-10-10T12:00:02.000Z')})
    `;
  });

  afterAll(async () => {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS "pipeline_cursor_items"');
    await db.$disconnect();
  });

  it('commits each eligible row exactly once across mutating pages', async () => {
    let cursor: unknown = null;
    const seen: string[] = [];

    while (true) {
      const rows = await db.$queryRaw<Array<{ id: string; createdAt: Date }>>`
        SELECT "id", "createdAt" FROM "pipeline_cursor_items"
        ORDER BY "createdAt" ASC, "id" ASC
      `;
      const result = await runBoundedStageUnits({
        records: rows,
        cursor,
        unitLimit: 2,
        processUnit: async (record) => {
          await db.$executeRaw`
            UPDATE "pipeline_cursor_items"
            SET "committed" = TRUE
            WHERE "id" = ${record.id} AND "committed" = FALSE
          `;
          seen.push(record.id);
          if (record.id === 'item-b') {
            await db.$executeRaw`
              DELETE FROM "pipeline_cursor_items" WHERE "id" = 'item-a'
            `;
            await db.$executeRaw`
              INSERT INTO "pipeline_cursor_items" ("id", "createdAt")
              VALUES ('item-late', ${new Date('2026-10-10T12:00:03.000Z')})
            `;
          }
        },
      });
      cursor = result.cursor;
      if (result.exhausted) break;
    }

    const committed = await db.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "pipeline_cursor_items"
      WHERE "committed" = TRUE
      ORDER BY "id"
    `;
    expect(committed.map((row) => row.id)).toEqual(['item-b', 'item-c', 'item-d', 'item-late']);
    expect(seen).toEqual(['item-a', 'item-b', 'item-c', 'item-d', 'item-late']);
    expect(decodeStageCursor(cursor)?.id).toBe('item-late');
  });
});
