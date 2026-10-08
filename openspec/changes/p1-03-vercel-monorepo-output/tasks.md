# Tasks

## 1. Deployment evidence and contract

- [ ] 1.1 Retrieve the failed PR #40 or main Vercel deployment logs, record redacted root-cause evidence, and verify the deployment ID and decisive log lines are documented without tokens or secrets
- [x] 1.2 Implement a side-effect-free validator for Vercel, Next.js, and build-environment settings and verify unit cases reject non-production `NODE_ENV`, output mismatch, and unsafe build ordering
- [x] 1.3 Adopt the app-local `apps/web/.next` contract for preview and production and verify tracked Vercel and Next.js configuration pass the validator
- [x] 1.4 Integrate P1-01 production readiness before Prisma and Next.js work and verify an invalid environment exits before either build step starts

## 2. Portable production build

- [x] 2.1 Add the canonical CAI-248 integration command for Prisma generation and a production web build and verify it succeeds from the clean locked workspace without local-only paths or prerender errors
- [x] 2.2 Add policy coverage for the build command and output contract and verify configuration drift causes a failing test
- [x] 2.3 Document build reproduction, failure recovery, the prior-deployment guarantee, and redacted evidence boundaries and verify every documented local command exists

## 3. Credential-free route smoke

- [x] 3.1 Implement the supplied-base-URL smoke CLI for health, homepage, topic, question, and admin login with HTTPS, timeout, body-size, status, and marker checks and verify the interface accepts no credential input
- [x] 3.2 Add fixture-server E2E coverage and verify exactly five unauthenticated GET requests pass while wrong status, marker, timeout, and unsafe URL cases fail
- [ ] 3.3 Run the smoke CLI against the Vercel preview with explicit representative IDs and verify all five public routes return their expected status and marker within Hobby limits

## 4. Canonical verification and review

- [x] 4.1 Add the exact CAI-248 Linear fixture, verification manifest, and unit/integration/E2E/regression package commands and verify exactly three scenarios mirror the delta spec
- [x] 4.2 Run strict OpenSpec validation, unit, integration, local E2E, regression, clean install, Prisma generation, production build, and actionlint in a fix loop until every available gate passes
- [x] 4.3 Commit the complete implementation, run `/opsx:verify` and commit-bound `verify:pr-ready`, and verify the report references the reviewed commit with no sensitive values
- [x] 4.4 Synchronize final implementation and cost evidence to CAI-248, open the comprehensive pull request, and verify the issue and PR reference the same change, tests, and external blockers
- [ ] 4.5 Monitor Linux CI, governance, adversarial review, and Vercel preview on the final head; fix code or configuration failures and verify every accessible check passes without merging

## Workflow follow-up

- Merge only after every required check, preview smoke, and validated adversarial finding is resolved.
- Archive the change after the pull request merges and update CAI-248 with final evidence.
