# Spec Delta

## Purpose

Defines the production build and route-verification contract that keeps Acta's
Vercel monorepo deployments consistent, safe, and recoverable.

## ADDED Requirements

### Requirement: Deployment configuration fails closed
The system SHALL validate the Vercel output directory against the effective Next.js output directory and SHALL require `NODE_ENV=production` before build work starts. Invalid configuration MUST fail before promotion while the prior deployment remains available, and diagnostics MUST exclude environment values and credentials.

#### Scenario: Invalid deployment configuration is rejected
- **GIVEN** Vercel, Next.js, and build-environment settings
- **WHEN** configuration validation runs
- **THEN** non-production `NODE_ENV` and mismatched output paths are rejected

### Requirement: Production monorepo builds are portable
The system SHALL expose one clean-install production build command that resolves npm workspaces and Prisma from committed monorepo paths. Preview and production MUST use the same output contract and MUST NOT depend on developer-machine paths or paid provider calls.

#### Scenario: Clean Linux production build succeeds
- **GIVEN** a clean Linux monorepo with `NODE_ENV=production`
- **WHEN** the Next.js build runs
- **THEN** workspace packages and Prisma resolve without local-only paths or prerender errors

### Requirement: Preview route smoke checks are bounded and credential-free
The system SHALL expose a smoke command for a supplied HTTPS preview base URL. One run MUST make only bounded GET requests for health, homepage, a representative topic, a representative question, and admin login; assert statuses and public content markers; send no admin credentials; and fail on any mismatch.

#### Scenario: Preview routes pass smoke verification
- **GIVEN** a preview deployment
- **WHEN** smoke tests request health, homepage, topic, question, and admin login
- **THEN** every route returns its expected status and content marker
