#!/usr/bin/env node

import process from 'node:process';
import { pathToFileURL } from 'node:url';

const MAX_BODY_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 15_000;

export class RuntimeCheckError extends Error {}

export function parseRuntimeArgs(argv) {
  const values = {};
  for (const token of argv) {
    if (!token.startsWith('--base-url=') && !token.startsWith('--timeout-ms=')) {
      throw new RuntimeCheckError(`unsupported argument ${token.split('=')[0]}`);
    }
    const [name, ...parts] = token.slice(2).split('=');
    values[name] = parts.join('=');
  }
  if (!values['base-url']) throw new RuntimeCheckError('--base-url is required');
  const baseUrl = new URL(values['base-url']);
  const loopback = ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname);
  if (baseUrl.protocol !== 'https:' && !(baseUrl.protocol === 'http:' && loopback)) {
    throw new RuntimeCheckError('base URL must use HTTPS');
  }
  if (baseUrl.username || baseUrl.password) {
    throw new RuntimeCheckError('base URL must not contain credentials');
  }
  const timeoutMs = Number(values['timeout-ms'] ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 600_000) {
    throw new RuntimeCheckError('timeout must be an integer from 100 to 600000');
  }
  return { baseUrl, timeoutMs };
}

async function readJson(response, name) {
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new RuntimeCheckError(`${name} response exceeded ${MAX_BODY_BYTES} bytes`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new RuntimeCheckError(`${name} returned invalid JSON`);
  }
}

export async function verifyRuntimeData(options, fetchImpl = globalThis.fetch) {
  const routes = [
    { name: 'health', path: '/api/health' },
    { name: 'topics', path: '/api/topics' },
    { name: 'questions', path: '/api/questions' },
  ];
  const results = {};
  for (const route of routes) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const response = await fetchImpl(new URL(route.path, options.baseUrl), {
        signal: controller.signal,
        headers: { 'user-agent': 'acta-neon-readonly-check/1' },
      });
      if (response.status !== 200) {
        throw new RuntimeCheckError(`${route.name} returned status ${response.status}`);
      }
      results[route.name] = await readJson(response, route.name);
    } catch (error) {
      if (error?.name === 'AbortError') throw new RuntimeCheckError(`${route.name} timed out`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  if (results.health?.database?.status !== 'connected') {
    throw new RuntimeCheckError('health did not report database connected');
  }
  if (!Array.isArray(results.topics) || results.topics.length === 0) {
    throw new RuntimeCheckError('topics API returned no production data');
  }
  if (!Array.isArray(results.questions) || results.questions.length === 0) {
    throw new RuntimeCheckError('questions API returned no production data');
  }
  return { topics: results.topics.length, questions: results.questions.length };
}

async function main() {
  const options = parseRuntimeArgs(process.argv.slice(2));
  const result = await verifyRuntimeData(options);
  process.stdout.write(
    `Vercel runtime check passed: database connected, ${result.topics} topics, `
    + `${result.questions} questions.\n`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const message = error instanceof RuntimeCheckError
      ? error.message
      : 'unexpected runtime verification failure';
    process.stderr.write(`Vercel runtime check failed: ${message}\n`);
    process.exitCode = 1;
  });
}
