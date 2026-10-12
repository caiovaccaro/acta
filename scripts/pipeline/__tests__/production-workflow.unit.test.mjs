import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  parsePositiveCap,
  parseTrigger,
  readProductionWorkflow,
  validateWorkflowDocument,
} from '../validate-production-workflow.mjs';

const root = path.resolve(import.meta.dirname, '../../..');

test('production workflow is read-only, bounded, and scheduled safely', async () => {
  const source = await readProductionWorkflow(root);
  assert.equal(validateWorkflowDocument(source), true);
  assert.match(source, /timeout-minutes:\s*330/);
  assert.ok(330 < 360);
  assert.doesNotMatch(source, /echo .*secrets/);
  assert.doesNotMatch(source, /printenv/);
});

test('dispatch inputs reject unsafe values and accept bounded caps', () => {
  assert.equal(parsePositiveCap('20', 'max_new_articles'), 20);
  assert.equal(parseTrigger('manual'), 'manual');
  assert.throws(() => parsePositiveCap('20; rm -rf /', 'max_new_articles'));
  assert.throws(() => parsePositiveCap('0', 'max_new_articles'));
  assert.throws(() => parseTrigger('delete'));
});
