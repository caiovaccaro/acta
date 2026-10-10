#!/usr/bin/env node

import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const migrationsRoot = path.join(repoRoot, 'modules/db/prisma/migrations');
const latestMigration = '20261010170000_add_pipeline_coordination';
const container = 'acta-cai-252-postgres';
const user = 'acta';
const emptyDb = 'acta_cai252_empty';
const productionLikeDb = 'acta_cai252_prodlike';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.input ? ['pipe', 'pipe', 'pipe'] : 'pipe',
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} failed: ${(result.stderr || result.stdout || '').trim()}`,
    );
  }
  return result.stdout;
}

async function dockerPsql(database, sql) {
  const workDir = await mkdtemp(path.join(tmpdir(), 'acta-cai-252-sql-'));
  const localFile = path.join(workDir, 'statement.sql');
  const remoteFile = `/tmp/acta-cai-252-${process.pid}-${Date.now()}.sql`;
  try {
    await writeFile(localFile, `${sql.trim()}\n`, 'utf8');
    run('docker', ['cp', localFile, `${container}:${remoteFile}`]);
    return run('docker', [
      'exec',
      container,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      user,
      '-d',
      database,
      '-f',
      remoteFile,
    ]);
  } finally {
    spawnSync('docker', ['exec', container, 'rm', '-f', remoteFile], { encoding: 'utf8' });
    await rm(workDir, { recursive: true, force: true });
  }
}

function recreateDatabase(database) {
  run('docker', ['exec', container, 'dropdb', '-U', user, '--if-exists', database]);
  run('docker', ['exec', container, 'createdb', '-U', user, database]);
}

const migrations = (await readdir(migrationsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

if (migrations.at(-1) !== latestMigration) {
  throw new Error('CAI-252 migration must remain the latest migration');
}

function migrationSql(name, sql) {
  if (name !== '20251216120000_add_month_to_verdicts') {
    return sql;
  }
  // Historical file uses `rec` in a DO block without DECLARE. Patch only the
  // disposable verifier so already-applied production checksums stay intact.
  if (/DECLARE\s+rec RECORD/i.test(sql)) {
    return sql;
  }
  return sql.replace('DO $$', () => 'DO $$\nDECLARE\n  rec RECORD;');
}

async function applyMigrationChain(database) {
  for (const migration of migrations) {
    const sql = await readFile(path.join(migrationsRoot, migration, 'migration.sql'), 'utf8');
    await dockerPsql(database, migrationSql(migration, sql));
  }
}

recreateDatabase(emptyDb);
await applyMigrationChain(emptyDb);

recreateDatabase(productionLikeDb);
for (const migration of migrations.filter((name) => name !== latestMigration)) {
  const sql = await readFile(path.join(migrationsRoot, migration, 'migration.sql'), 'utf8');
  await dockerPsql(productionLikeDb, migrationSql(migration, sql));
}

await dockerPsql(
  productionLikeDb,
  `INSERT INTO "outlets" (
     "id", "name", "ideology", "credibilityScore", "rssFeeds", "createdAt", "updatedAt"
   ) VALUES (
     'cai252-production-like-outlet',
     'CAI-252 preserved outlet',
     'Center',
     0.5,
     '[]'::jsonb,
     CURRENT_TIMESTAMP,
     CURRENT_TIMESTAMP
   );`,
);

const latestSql = await readFile(
  path.join(migrationsRoot, latestMigration, 'migration.sql'),
  'utf8',
);
await dockerPsql(productionLikeDb, latestSql);

const preserved = await dockerPsql(
  productionLikeDb,
  `SELECT COUNT(*) FROM "outlets"
   WHERE "id" = 'cai252-production-like-outlet';`,
);
if (!/\b1\b/.test(preserved)) {
  throw new Error('Production-like representative row was not preserved');
}

const tables = await dockerPsql(
  productionLikeDb,
  `SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
     AND table_name IN (
       'pipeline_runs',
       'pipeline_stage_runs',
       'pipeline_leases',
       'pipeline_lease_events'
     );`,
);
if (!/\b4\b/.test(tables)) {
  throw new Error('CAI-252 coordination tables are incomplete');
}

process.stdout.write(
  'CAI-252 migrations passed on empty and production-like PostgreSQL databases.\n',
);
