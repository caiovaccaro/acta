#!/usr/bin/env node

import process from 'node:process';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const execFileAsync = promisify(execFile);

export class SmokeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SmokeError';
  }
}

export function parseSmokeArgs(argv) {
  const values = {};
  const allowed = new Set(['base-url', 'topic-id', 'question-id', 'timeout-ms', 'transport']);
  for (const token of argv) {
    if (!token.startsWith('--') || !token.includes('=')) {
      throw new SmokeError(`Unsupported argument: ${token}`);
    }
    const [name, ...parts] = token.slice(2).split('=');
    if (!allowed.has(name)) {
      throw new SmokeError(`Unsupported argument: --${name}`);
    }
    values[name] = parts.join('=');
  }

  for (const required of ['base-url', 'topic-id', 'question-id']) {
    if (!values[required]) throw new SmokeError(`--${required}=<value> is required`);
  }
  const timeoutMs = Number(values['timeout-ms'] ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000) {
    throw new SmokeError('--timeout-ms must be an integer from 100 to 600000');
  }
  const transport = values.transport ?? 'fetch';
  if (!['fetch', 'vercel'].includes(transport)) {
    throw new SmokeError('--transport must be fetch or vercel');
  }
  return {
    baseUrl: values['base-url'],
    topicId: values['topic-id'],
    questionId: values['question-id'],
    timeoutMs,
    transport,
  };
}

export function validateBaseUrl(value) {
  const url = new URL(value);
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new SmokeError('base URL must use HTTPS (HTTP is allowed only for loopback tests)');
  }
  if (url.username || url.password) {
    throw new SmokeError('base URL must not contain credentials');
  }
  url.pathname = url.pathname.replace(/\/+$/, '');
  url.search = '';
  url.hash = '';
  return url;
}

export function smokeRoutes({ topicId, questionId }) {
  return [
    { name: 'health', path: '/api/health', status: 200, marker: '"status":"ok"' },
    { name: 'homepage', path: '/', status: 200, marker: 'Difficult questions.' },
    { name: 'topic', path: `/topics/${encodeURIComponent(topicId)}`, status: 200, marker: 'Loading topic...' },
    { name: 'question', path: `/questions/${encodeURIComponent(questionId)}`, status: 200, marker: 'Loading question...' },
    { name: 'admin login', path: '/admin/login', status: 200, marker: 'Admin Login' },
  ];
}

async function readBoundedBody(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new SmokeError(`response exceeded ${MAX_BODY_BYTES} bytes`);
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export async function smokeDeployment(options, fetchImpl = globalThis.fetch) {
  const baseUrl = validateBaseUrl(options.baseUrl);
  const results = [];
  for (const route of smokeRoutes(options)) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    try {
      const response = await fetchImpl(new URL(route.path, baseUrl), {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'user-agent': 'acta-deploy-smoke/1' },
      });
      if (response.status !== route.status) {
        throw new SmokeError(`${route.name} returned ${response.status}; expected ${route.status}`);
      }
      const body = await readBoundedBody(response);
      if (!body.includes(route.marker)) {
        throw new SmokeError(`${route.name} did not contain its expected public marker`);
      }
      results.push({ name: route.name, status: response.status });
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new SmokeError(`${route.name} timed out`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  return results;
}

export async function vercelCurlFetch(url, init = {}, run = execFileAsync) {
  if (init.method && init.method !== 'GET') {
    throw new SmokeError('Vercel smoke transport supports GET only');
  }
  try {
    const { stdout } = await run(
      'npx',
      [
        'vercel',
        'curl',
        url.toString(),
        '--',
        '--silent',
        '--show-error',
        '--write-out',
        '\\n%{http_code}',
      ],
      {
        encoding: 'utf8',
        maxBuffer: MAX_BODY_BYTES + 1024,
        signal: init.signal,
      },
    );
    const separator = stdout.lastIndexOf('\n');
    const status = Number(stdout.slice(separator + 1));
    if (separator < 0 || !Number.isInteger(status)) {
      throw new SmokeError('Vercel smoke transport returned an invalid response');
    }
    return new Response(stdout.slice(0, separator), { status });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    if (error instanceof SmokeError) throw error;
    throw new SmokeError('Vercel smoke transport failed; verify CLI authentication and deployment access');
  }
}

async function main() {
  const options = parseSmokeArgs(process.argv.slice(2));
  const fetchImpl = options.transport === 'vercel' ? vercelCurlFetch : globalThis.fetch;
  const results = await smokeDeployment(options, fetchImpl);
  for (const result of results) {
    process.stdout.write(`PASS ${result.name} (${result.status})\n`);
  }
  process.stdout.write(`Deployment smoke passed for ${results.length} public routes.\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof SmokeError ? error.message : 'unexpected smoke failure';
    process.stderr.write(`Deployment smoke failed: ${message}\n`);
    process.exitCode = 1;
  });
}
