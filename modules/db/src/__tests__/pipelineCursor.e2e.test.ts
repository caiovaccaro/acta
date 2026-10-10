import { spawn } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';

const describeDatabase = process.env.RUN_PIPELINE_CURSOR_E2E_TESTS === '1'
  ? describe
  : describe.skip;

function runResume(mode: string): Promise<{ interrupted?: boolean; done?: boolean }> {
  const runnerPath = resolvePath(
    process.cwd(),
    'src/__tests__/fixtures/resumeCursorRunner.ts',
  );
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', runnerPath, mode], {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Resume runner failed (${code}): ${stderr}`));
        return;
      }
      resolve(JSON.parse(stdout.trim().split('\n').at(-1) ?? '{}'));
    });
  });
}

describeDatabase('interrupted cursor resume E2E', () => {
  jest.setTimeout(30_000);
  const db = new PrismaClient();

  beforeEach(async () => {
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pipeline_cursor_resume_items" (
        "id" TEXT PRIMARY KEY,
        "createdAt" TIMESTAMP(3) NOT NULL
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pipeline_cursor_resume_writes" (
        "id" TEXT PRIMARY KEY
      )
    `);
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pipeline_cursor_resume_state" (
        "id" TEXT PRIMARY KEY,
        "cursor" JSONB
      )
    `);
    await db.$executeRawUnsafe('TRUNCATE TABLE "pipeline_cursor_resume_items"');
    await db.$executeRawUnsafe('TRUNCATE TABLE "pipeline_cursor_resume_writes"');
    await db.$executeRawUnsafe('TRUNCATE TABLE "pipeline_cursor_resume_state"');
    await db.$executeRaw`
      INSERT INTO "pipeline_cursor_resume_items" ("id", "createdAt")
      VALUES
        ('one', ${new Date('2026-10-10T12:00:00.000Z')}),
        ('two', ${new Date('2026-10-10T12:00:00.000Z')}),
        ('three', ${new Date('2026-10-10T12:00:01.000Z')}),
        ('four', ${new Date('2026-10-10T12:00:02.000Z')})
    `;
    await db.$executeRawUnsafe(`
      INSERT INTO "pipeline_cursor_resume_state" ("id", "cursor")
      VALUES ('stage', NULL)
    `);
  });

  afterAll(async () => {
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS "pipeline_cursor_resume_items"');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS "pipeline_cursor_resume_writes"');
    await db.$executeRawUnsafe('DROP TABLE IF EXISTS "pipeline_cursor_resume_state"');
    await db.$disconnect();
  });

  it('resumes after a checkpoint without duplicate writes', async () => {
    const first = await runResume('interrupt');
    expect(first.interrupted).toBe(true);

    const second = await runResume('resume');
    expect(second.done).toBe(true);

    const writes = await db.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "pipeline_cursor_resume_writes" ORDER BY "id"
    `;
    expect(writes.map((row) => row.id)).toEqual(['four', 'one', 'three', 'two']);
  });
});
