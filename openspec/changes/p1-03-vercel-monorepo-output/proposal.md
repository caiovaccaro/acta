# Proposal

## Why

CAI-248 addresses Vercel deployments that fail after repository cleanup because
the production build environment and monorepo output contract are not enforced
before promotion. The repository needs one validated output location and a safe,
repeatable route smoke test so a broken preview cannot replace the last working
deployment.

## What Changes

- Validate the Vercel configuration, Next.js output location, and production
  build environment as one deployment contract.
- Make preview and production use the same standard Next.js monorepo output and
  fail before build when `NODE_ENV` is not `production` or paths disagree.
- Add a bounded smoke command for health, homepage, representative topic,
  representative question, and admin login routes without credentials.
- Define canonical CAI-248 unit, integration, preview E2E, and regression
  commands plus commit-bound verification evidence.
- Document redacted deployment evidence and recovery behavior.

## Capabilities

### New Capabilities

- `vercel-deployment-readiness`: Defines the validated Vercel monorepo build
  contract and credential-free route checks required before promotion.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-248.
- **Affected systems:** `vercel.json`, `apps/web/next.config.js`, production
  configuration preflight, deployment scripts and tests, root package scripts,
  OpenSpec verification, and Vercel preview deployments.
- **Security:** Validation and smoke output contain configuration names, public
  URLs, statuses, and public markers only. Smoke requests never submit admin
  credentials, and evidence must redact tokens and secret values.
- **Cost:** Validation is local build work plus five bounded GET requests per
  smoke run. It introduces no scheduled work, paid provider calls, or recurring
  runtime and remains within Vercel Hobby and the USD 50 monthly ceiling.
- **Rollback:** Revert the configuration, validation, smoke tooling, and
  CAI-248 evidence. Vercel's failed-build behavior leaves the previously
  promoted deployment available; rollback requires no data migration.
- **Out of scope:** Database migration, hosted database provisioning, pipeline
  scheduling, and authenticated admin behavior.
