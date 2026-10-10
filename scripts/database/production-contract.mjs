#!/usr/bin/env node

import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { PrismaClient } from '@prisma/client';

export const REQUIRED_TABLES = ['_prisma_migrations', 'topics', 'questions'];
export const DEFAULT_BOUNDS = Object.freeze({
  topics: { min: 1, max: 1_000_000 },
  questions: { min: 1, max: 10_000_000 },
});

export class DatabaseContractError extends Error {
  constructor(contract, detail) {
    super(`${contract}: ${detail}`);
    this.name = 'DatabaseContractError';
    this.contract = contract;
  }
}

function parsePostgresUrl(name, value) {
  if (!value) throw new DatabaseContractError(name, 'is required');
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new DatabaseContractError(name, 'must be a valid PostgreSQL URL');
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname || !parsed.pathname) {
    throw new DatabaseContractError(name, 'must be a PostgreSQL URL with host and database');
  }
  return parsed;
}

export function validateConnectionContract(environment) {
  const runtime = parsePostgresUrl('DATABASE_URL', environment.DATABASE_URL);
  const direct = parsePostgresUrl('DIRECT_DATABASE_URL', environment.DIRECT_DATABASE_URL);
  if (!runtime.hostname.includes('-pooler.')) {
    throw new DatabaseContractError('DATABASE_URL', 'must use the pooled runtime endpoint');
  }
  if (direct.hostname.includes('-pooler.')) {
    throw new DatabaseContractError('DIRECT_DATABASE_URL', 'must use the direct migration endpoint');
  }
  if (runtime.hostname === direct.hostname) {
    throw new DatabaseContractError('connection roles', 'runtime and migration hosts must differ');
  }
  if (runtime.pathname !== direct.pathname) {
    throw new DatabaseContractError('connection roles', 'runtime and migration database names must match');
  }
  return { runtimeRole: 'pooled', migrationRole: 'direct' };
}

export function validateMigrationGate(environment) {
  parsePostgresUrl('DIRECT_DATABASE_URL', environment.DIRECT_DATABASE_URL);
  if (environment.ALLOW_PRODUCTION_MIGRATION !== 'CAI-245') {
    throw new DatabaseContractError(
      'ALLOW_PRODUCTION_MIGRATION',
      'must equal the issue acknowledgement CAI-245',
    );
  }
  return true;
}

export function validateIntegrityMetadata({ tables, migrations, counts, representatives }, expected) {
  const missingTables = REQUIRED_TABLES.filter((table) => !tables.includes(table));
  if (missingTables.length) {
    throw new DatabaseContractError('required tables', `missing ${missingTables.join(', ')}`);
  }

  const expectedMigrations = [...expected.migrations].sort();
  const actualMigrations = [...migrations].sort();
  const migrationDrift = expectedMigrations.length !== actualMigrations.length
    || expectedMigrations.some((migration, index) => migration !== actualMigrations[index]);
  if (migrationDrift) {
    throw new DatabaseContractError(
      'migration state',
      `expected ${expectedMigrations.length} successful migrations; found ${actualMigrations.length}`,
    );
  }

  for (const [name, bounds] of Object.entries(expected.bounds)) {
    const count = counts[name];
    if (!Number.isSafeInteger(count) || count < bounds.min || count > bounds.max) {
      throw new DatabaseContractError(
        `${name} row count`,
        `must be an integer from ${bounds.min} to ${bounds.max}; found ${String(count)}`,
      );
    }
  }

  for (const name of ['topic', 'question']) {
    if (representatives[name] !== true) {
      throw new DatabaseContractError(`representative ${name} ID`, 'was not found');
    }
  }
  return true;
}

export async function expectedMigrationNames(
  migrationsDirectory = path.resolve('modules/db/prisma/migrations'),
) {
  const entries = await readdir(migrationsDirectory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

export async function inspectDatabase({
  connectionString,
  topicId,
  questionId,
  bounds = DEFAULT_BOUNDS,
  migrationsDirectory,
}) {
  parsePostgresUrl('inspection connection', connectionString);
  if (!topicId) throw new DatabaseContractError('EXPECTED_TOPIC_ID', 'is required');
  if (!questionId) throw new DatabaseContractError('EXPECTED_QUESTION_ID', 'is required');

  const expectedMigrations = await expectedMigrationNames(migrationsDirectory);
  const prisma = new PrismaClient({ datasources: { db: { url: connectionString } } });
  try {
    const metadata = await prisma.$transaction(async (transaction) => {
      await transaction.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const tableRows = await transaction.$queryRawUnsafe(
        `SELECT name FROM unnest($1::text[]) AS name
         WHERE to_regclass('public.' || name) IS NOT NULL`,
        REQUIRED_TABLES,
      );
      const migrationRows = await transaction.$queryRawUnsafe(
        `SELECT migration_name FROM "_prisma_migrations"
         WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
         ORDER BY migration_name`,
      );
      const [topicCount, questionCount, topicRepresentative, questionRepresentative] = await Promise.all([
        transaction.$queryRawUnsafe('SELECT count(*)::int AS count FROM topics'),
        transaction.$queryRawUnsafe('SELECT count(*)::int AS count FROM questions'),
        transaction.$queryRawUnsafe('SELECT EXISTS(SELECT 1 FROM topics WHERE id = $1) AS found', topicId),
        transaction.$queryRawUnsafe(
          'SELECT EXISTS(SELECT 1 FROM questions WHERE id = $1) AS found',
          questionId,
        ),
      ]);
      return {
        tables: tableRows.map((row) => row.name),
        migrations: migrationRows.map((row) => row.migration_name),
        counts: { topics: topicCount[0].count, questions: questionCount[0].count },
        representatives: {
          topic: topicRepresentative[0].found,
          question: questionRepresentative[0].found,
        },
      };
    });
    validateIntegrityMetadata(metadata, {
      migrations: expectedMigrations,
      bounds,
    });
    return { counts: metadata.counts, migrations: metadata.migrations.length };
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'connections') {
    validateConnectionContract(process.env);
    process.stdout.write('Production database connection roles are valid.\n');
    return;
  }
  if (mode === 'integrity') {
    const result = await inspectDatabase({
      connectionString: process.env.DATABASE_URL,
      topicId: process.env.EXPECTED_TOPIC_ID,
      questionId: process.env.EXPECTED_QUESTION_ID,
    });
    process.stdout.write(
      `Read-only integrity passed: ${result.migrations} migrations, `
      + `${result.counts.topics} topics, ${result.counts.questions} questions.\n`,
    );
    return;
  }
  throw new DatabaseContractError('command', 'must be connections or integrity');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof DatabaseContractError
      ? error.message
      : 'unexpected database verification failure';
    process.stderr.write(`Production database verification failed: ${message}\n`);
    process.exitCode = 1;
  });
}
