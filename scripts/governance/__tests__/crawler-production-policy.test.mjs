import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../../..');

test('production crawler is capped and browserless', async () => {
  const [
    rootPackage,
    crawlerPackage,
    entryPoint,
    runner,
    workflow,
    legacyJob,
  ] = await Promise.all([
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'apps/crawler/package.json'), 'utf8').then(JSON.parse),
    readFile(path.join(root, 'apps/crawler/src/scripts/runCrawler.js'), 'utf8'),
    readFile(path.join(root, 'apps/crawler/src/jobs/crawlerRun.js'), 'utf8'),
    readFile(path.join(root, '.github/workflows/linux-ci.yml'), 'utf8'),
    readFile(path.join(root, 'apps/crawler/src/jobs/refreshFeeds.js'), 'utf8'),
  ]);

  assert.equal(crawlerPackage.scripts.start.includes('runCrawler.js'), true);
  assert.equal(crawlerPackage.dependencies.playwright, undefined);
  assert.match(entryPoint, /executeCrawler/);
  assert.match(runner, /maxArticles/);
  assert.match(runner, /CheerioCrawler/);
  assert.doesNotMatch(`${entryPoint}\n${runner}`, /playwright|chromium/i);
  assert.doesNotMatch(workflow, /playwright install|chromium/i);
  assert.doesNotMatch(legacyJob, /\bpilotOutlets\b/);

  for (const testClass of ['unit', 'integration', 'e2e', 'regression']) {
    assert.equal(
      typeof rootPackage.scripts[`test:p1-02:${testClass}`],
      'string',
      `missing canonical P1-02 ${testClass} command`,
    );
  }
});
