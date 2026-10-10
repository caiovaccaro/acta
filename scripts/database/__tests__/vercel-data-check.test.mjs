import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseRuntimeArgs,
  RuntimeCheckError,
  verifyRuntimeData,
} from '../vercel-data-check.mjs';

test('parses a credential-free HTTPS deployment URL', () => {
  const result = parseRuntimeArgs(['--base-url=https://acta.example.test']);
  assert.equal(result.baseUrl.origin, 'https://acta.example.test');
});

test('verifies connected health and non-empty public data', async () => {
  const responses = new Map([
    ['/api/health', { database: { status: 'connected' } }],
    ['/api/topics', [{ id: 'public-topic' }]],
    ['/api/questions', [{ id: 'public-question' }]],
  ]);
  const result = await verifyRuntimeData(
    { baseUrl: new URL('https://acta.example.test'), timeoutMs: 1000 },
    async (url) => new Response(JSON.stringify(responses.get(url.pathname)), { status: 200 }),
  );
  assert.deepEqual(result, { topics: 1, questions: 1 });
});

test('fails when representative public data is empty', async () => {
  const responses = new Map([
    ['/api/health', { database: { status: 'connected' } }],
    ['/api/topics', []],
    ['/api/questions', [{ id: 'public-question' }]],
  ]);
  await assert.rejects(
    verifyRuntimeData(
      { baseUrl: new URL('https://acta.example.test'), timeoutMs: 1000 },
      async (url) => new Response(JSON.stringify(responses.get(url.pathname)), { status: 200 }),
    ),
    (error) => error instanceof RuntimeCheckError && /topics API/.test(error.message),
  );
});
