import { ReadinessError } from './readiness.mjs';

export const REQUIRED_CHECKS = ['governance', 'adversarial-review'];

export function desiredProtection() {
  return {
    required_status_checks: {
      strict: true,
      contexts: REQUIRED_CHECKS,
    },
    enforce_admins: true,
    required_pull_request_reviews: null,
    restrictions: null,
    required_conversation_resolution: true,
    required_linear_history: true,
    allow_force_pushes: false,
    allow_deletions: false,
  };
}

export function auditProtection(protection) {
  const contexts = protection.required_status_checks?.contexts
    ?? protection.required_status_checks?.checks?.map((check) => check.context)
    ?? [];
  const missing = REQUIRED_CHECKS.filter((check) => !contexts.includes(check));
  const failures = [];
  if (missing.length) failures.push(`missing required checks: ${missing.join(', ')}`);
  if (protection.required_status_checks?.strict !== true) {
    failures.push('required checks are not strict');
  }
  const admins = protection.enforce_admins?.enabled ?? protection.enforce_admins;
  if (admins !== true) failures.push('administrators are not protected');
  const conversations = protection.required_conversation_resolution?.enabled
    ?? protection.required_conversation_resolution;
  if (conversations !== true) failures.push('conversation resolution is not required');
  const linear = protection.required_linear_history?.enabled
    ?? protection.required_linear_history;
  if (linear !== true) failures.push('linear history is not required');
  if (protection.allow_force_pushes?.enabled === true || protection.allow_force_pushes === true) {
    failures.push('force pushes are allowed');
  }
  if (protection.allow_deletions?.enabled === true || protection.allow_deletions === true) {
    failures.push('branch deletion is allowed');
  }
  return failures;
}

export async function githubRequest({
  path,
  method = 'GET',
  body,
  token = process.env.GH_TOKEN,
  fetchImpl = globalThis.fetch,
}) {
  if (!token) throw new ReadinessError('GH_TOKEN is required for branch-protection operations');
  const response = await fetchImpl(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new ReadinessError(`GitHub branch-protection request failed with status ${response.status}`);
  }
  return response.json();
}
