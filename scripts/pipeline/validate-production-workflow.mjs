import { readFile } from 'node:fs/promises';
import path from 'node:path';

const UNSAFE_INPUT = /[^A-Za-z0-9_-]/;

export function parsePositiveCap(value, name) {
  if (typeof value !== 'string' || UNSAFE_INPUT.test(value)) {
    throw new Error(`${name} is not a safe integer input`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 500) {
    throw new Error(`${name} must be a bounded positive integer`);
  }
  return parsed;
}

export function parseTrigger(value) {
  if (value !== 'scheduled' && value !== 'manual' && value !== 'retry') {
    throw new Error('trigger must be scheduled, manual, or retry');
  }
  return value;
}

export function validateWorkflowDocument(source) {
  if (!/permissions:\n  contents: read/.test(source)) {
    throw new Error('workflow must be contents: read');
  }
  if (/\b(?:write|write-all)\b/.test(source)) {
    throw new Error('workflow must not request write permissions');
  }
  if (!/timeout-minutes:\s*330/.test(source)) {
    throw new Error('workflow timeout must be 330 minutes');
  }
  if (!/group:\s*acta-production-pipeline/.test(source)) {
    throw new Error('workflow must use the production concurrency group');
  }
  if (!/cancel-in-progress:\s*false/.test(source)) {
    throw new Error('workflow must not cancel an in-progress slice');
  }
  if (!/cron:\s*"0 \*\/6 \* \* \*"/.test(source)) {
    throw new Error('workflow must schedule every six hours');
  }
  if (/self-hosted/.test(source) || !/runs-on:\s*ubuntu-latest/.test(source)) {
    throw new Error('workflow must use the standard public runner');
  }
  if (!/npm ci/.test(source) || !/db:migrate:deploy/.test(source) || !/pipeline:run-slice/.test(source)) {
    throw new Error('workflow must install, migrate, and run a slice');
  }
  if (!/secrets\.(DATABASE_URL|OPENAI_API_KEY|TAVILY_API_KEY|RESEND_API_KEY|PIPELINE_EMAIL_TO|PIPELINE_EMAIL_FROM)/.test(source)) {
    throw new Error('workflow must consume the documented secret contract');
  }
  if (/echo:.*secrets\./i.test(source) || /printenv/.test(source)) {
    throw new Error('workflow must not print secrets');
  }
  return true;
}

export async function readProductionWorkflow(repoRoot) {
  return readFile(
    path.join(repoRoot, '.github/workflows/production-pipeline.yml'),
    'utf8',
  );
}
