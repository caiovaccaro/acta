import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import {
  parseSmokeArgs,
  SmokeError,
  smokeDeployment,
  validateBaseUrl,
} from '../smoke.mjs';

const markers = new Map([
  ['/api/health', '{"status":"ok"}'],
  ['/', '<h1>Difficult questions.</h1>'],
  ['/topics/topic-1', '<p>Loading topic...</p>'],
  ['/questions/question-1', '<p>Loading question...</p>'],
  ['/admin/login', '<h1>Admin Login</h1>'],
]);

async function withServer(handler, run) {
  const server = createServer(handler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (
      error ? reject(error) : resolve()
    )));
  }
}

const optionsFor = (baseUrl) => ({
  baseUrl,
  topicId: 'topic-1',
  questionId: 'question-1',
  timeoutMs: 500,
});

test('requests exactly five public routes without credentials', async () => {
  const requests = [];
  await withServer((request, response) => {
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      cookie: request.headers.cookie,
    });
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end(markers.get(request.url));
  }, async (baseUrl) => {
    const results = await smokeDeployment(optionsFor(baseUrl));
    assert.equal(results.length, 5);
  });

  assert.deepEqual(requests.map(({ method, url }) => ({ method, url })), [
    { method: 'GET', url: '/api/health' },
    { method: 'GET', url: '/' },
    { method: 'GET', url: '/topics/topic-1' },
    { method: 'GET', url: '/questions/question-1' },
    { method: 'GET', url: '/admin/login' },
  ]);
  assert.ok(requests.every(({ authorization, cookie }) => !authorization && !cookie));
});

test('rejects wrong statuses and public markers', async () => {
  await withServer((request, response) => {
    response.writeHead(request.url === '/api/health' ? 503 : 200);
    response.end(markers.get(request.url));
  }, async (baseUrl) => {
    await assert.rejects(smokeDeployment(optionsFor(baseUrl)), /returned 503/);
  });

  await withServer((request, response) => {
    response.writeHead(200);
    response.end(request.url === '/api/health' ? 'healthy but wrong marker' : markers.get(request.url));
  }, async (baseUrl) => {
    await assert.rejects(smokeDeployment(optionsFor(baseUrl)), /expected public marker/);
  });
});

test('rejects timeouts, oversized bodies, and unsafe URLs', async () => {
  await withServer((_request, response) => {
    setTimeout(() => response.end('late'), 200);
  }, async (baseUrl) => {
    await assert.rejects(
      smokeDeployment({ ...optionsFor(baseUrl), timeoutMs: 100 }),
      /timed out/,
    );
  });

  await withServer((_request, response) => {
    response.end('x'.repeat(1_000_001));
  }, async (baseUrl) => {
    await assert.rejects(smokeDeployment(optionsFor(baseUrl)), /exceeded 1000000 bytes/);
  });

  assert.throws(() => validateBaseUrl('http://example.com'), SmokeError);
  assert.throws(() => validateBaseUrl('https://user:password@example.com'), /credentials/);
});

test('CLI accepts only public route inputs', () => {
  assert.deepEqual(
    parseSmokeArgs([
      '--base-url=https://preview.example.com',
      '--topic-id=topic-1',
      '--question-id=question-1',
    ]),
    {
      baseUrl: 'https://preview.example.com',
      topicId: 'topic-1',
      questionId: 'question-1',
      timeoutMs: 10_000,
    },
  );
  assert.throws(
    () => parseSmokeArgs([
      '--base-url=https://preview.example.com',
      '--topic-id=topic-1',
      '--question-id=question-1',
      '--password=secret',
    ]),
    /Unsupported argument: --password/,
  );
});
