/**
 * Check OpenAI quota/usage (best-effort)
 *
 * Note: OpenAI does not guarantee public quota endpoints. These calls may fail
 * depending on account/project permissions.
 *
 * Usage:
 *   npm run db:check:openai-quota
 *   npm run db:check:openai-quota -- --start=2026-01-01 --end=2026-01-31
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { parseArgs } from 'util';

// Load environment variables
const projectRoot = resolve(process.cwd(), '../..');
const envPath = resolve(projectRoot, '.env');
config({ path: envPath });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_ORG = process.env.OPENAI_ORG;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY is required');
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    start: { type: 'string' },
    end: { type: 'string' },
  },
});

const start = values.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const end = values.end || new Date().toISOString().slice(0, 10);

function buildHeaders() {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  };
  if (OPENAI_ORG) {
    headers['OpenAI-Organization'] = OPENAI_ORG;
  }
  return headers;
}

async function fetchJson(url: string) {
  const res = await fetch(url, { headers: buildHeaders() });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, json: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, json: { raw: text } };
  }
}

async function main() {
  console.log(`🔍 Checking OpenAI usage from ${start} to ${end}\n`);

  // Usage endpoint (best-effort)
  const usageUrl = `https://api.openai.com/v1/dashboard/billing/usage?start_date=${start}&end_date=${end}`;
  const usage = await fetchJson(usageUrl);

  if (usage.ok) {
    console.log('✅ Usage response:');
    console.log(JSON.stringify(usage.json, null, 2));
  } else {
    console.log('⚠️  Usage endpoint not available for this key.');
    console.log(`   Status: ${usage.status}`);
    console.log(JSON.stringify(usage.json, null, 2));
  }

  // Credit grants endpoint (legacy, best-effort)
  const creditsUrl = 'https://api.openai.com/v1/dashboard/billing/credit_grants';
  const credits = await fetchJson(creditsUrl);

  if (credits.ok) {
    console.log('\n✅ Credit grants response:');
    console.log(JSON.stringify(credits.json, null, 2));
  } else {
    console.log('\n⚠️  Credit grants endpoint not available for this key.');
    console.log(`   Status: ${credits.status}`);
    console.log(JSON.stringify(credits.json, null, 2));
  }
}

main().catch((error) => {
  console.error('❌ Error checking OpenAI quota:', error);
  process.exit(1);
});

