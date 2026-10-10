import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DatabaseContractError,
  validateConnectionContract,
  validateIntegrityMetadata,
  validateMigrationGate,
} from '../production-contract.mjs';

const secret = 'do-not-leak-this-value';

test('accepts distinct pooled runtime and direct migration endpoints', () => {
  assert.deepEqual(
    validateConnectionContract({
      DATABASE_URL: `postgresql://user:${secret}@project-pooler.example.net/acta`,
      DIRECT_DATABASE_URL: `postgresql://user:${secret}@project.example.net/acta`,
    }),
    { runtimeRole: 'pooled', migrationRole: 'direct' },
  );
});

test('connection failures name contracts without exposing values', () => {
  assert.throws(
    () => validateConnectionContract({
      DATABASE_URL: `postgresql://user:${secret}@project.example.net/acta`,
      DIRECT_DATABASE_URL: `postgresql://user:${secret}@project-pooler.example.net/acta`,
    }),
    (error) => {
      assert.equal(error instanceof DatabaseContractError, true);
      assert.match(error.message, /DATABASE_URL/);
      assert.doesNotMatch(error.message, new RegExp(secret));
      return true;
    },
  );
});

test('migration deployment fails closed without exact acknowledgement', () => {
  assert.throws(
    () => validateMigrationGate({
      DIRECT_DATABASE_URL: `postgresql://user:${secret}@project.example.net/acta`,
      ALLOW_PRODUCTION_MIGRATION: 'yes',
    }),
    /ALLOW_PRODUCTION_MIGRATION/,
  );
});

test('integrity metadata accepts exact schema, migration, bounds, and IDs', () => {
  assert.equal(validateIntegrityMetadata(
    {
      tables: ['_prisma_migrations', 'topics', 'questions'],
      migrations: ['001_initial', '002_feature'],
      counts: { topics: 2, questions: 3 },
      representatives: { topic: true, question: true },
    },
    {
      migrations: ['001_initial', '002_feature'],
      bounds: {
        topics: { min: 1, max: 10 },
        questions: { min: 1, max: 10 },
      },
    },
  ), true);
});

for (const [name, metadata, expectedMessage] of [
  [
    'missing table',
    {
      tables: ['_prisma_migrations', 'topics'],
      migrations: ['001_initial'],
      counts: { topics: 1, questions: 1 },
      representatives: { topic: true, question: true },
    },
    /required tables.*questions/,
  ],
  [
    'migration drift',
    {
      tables: ['_prisma_migrations', 'topics', 'questions'],
      migrations: [],
      counts: { topics: 1, questions: 1 },
      representatives: { topic: true, question: true },
    },
    /migration state/,
  ],
  [
    'out-of-bounds count',
    {
      tables: ['_prisma_migrations', 'topics', 'questions'],
      migrations: ['001_initial'],
      counts: { topics: 0, questions: 1 },
      representatives: { topic: true, question: true },
    },
    /topics row count/,
  ],
  [
    'missing representative',
    {
      tables: ['_prisma_migrations', 'topics', 'questions'],
      migrations: ['001_initial'],
      counts: { topics: 1, questions: 1 },
      representatives: { topic: false, question: true },
    },
    /representative topic ID/,
  ],
]) {
  test(`rejects ${name} with an actionable contract name`, () => {
    assert.throws(
      () => validateIntegrityMetadata(metadata, {
        migrations: ['001_initial'],
        bounds: {
          topics: { min: 1, max: 10 },
          questions: { min: 1, max: 10 },
        },
      }),
      expectedMessage,
    );
  });
}
