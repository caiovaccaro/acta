import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const rootPackage = JSON.parse(await readFile(new URL('../../../package.json', import.meta.url), 'utf8'));
const linuxCi = await readFile(new URL('../../../.github/workflows/linux-ci.yml', import.meta.url), 'utf8');
const vercelConfig = await readFile(new URL('../../../vercel.json', import.meta.url), 'utf8');

test('controlled production migration is an isolated manual command', () => {
  assert.match(rootPackage.scripts['db:production:migrate'], /deploy-migrations\.mjs/);
  for (const [name, command] of Object.entries(rootPackage.scripts)) {
    if (name === 'db:production:migrate') continue;
    assert.doesNotMatch(command, /deploy-migrations|ALLOW_PRODUCTION_MIGRATION/);
  }
  assert.doesNotMatch(linuxCi, /db:production:migrate|ALLOW_PRODUCTION_MIGRATION/);
  assert.doesNotMatch(vercelConfig, /db:production:migrate|deploy-migrations/);
});

test('CI uses disposable restore verification and no production URLs', () => {
  assert.match(linuxCi, /test:p1-04:integration/);
  assert.doesNotMatch(linuxCi, /DIRECT_DATABASE_URL:/);
  assert.doesNotMatch(linuxCi, /neon\.tech/);
});
