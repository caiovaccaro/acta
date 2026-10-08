# Proposal

## Why

CAI-247 addresses the absence of a repeatable Linux verification path and a
complete, non-secret production configuration contract. Without both, changes
can pass locally while failing in cloud builds or leaking sensitive values in
diagnostics.

## What Changes

- Add a production configuration validator that checks required variable
  presence, format, ranges, and cross-field constraints without printing
  values.
- Define canonical unit, integration, end-to-end, and regression commands for
  this change and make them consumable by `verify:pr-ready`.
- Add a bounded Linux CI workflow that installs from the lockfile, generates
  Prisma, provisions a disposable PostgreSQL service, validates fixture
  configuration, runs workspace tests, and builds the web application.
- Add commit-bound verification evidence for CAI-247.
- Keep production deployment and production credentials outside this change.

## Capabilities

### New Capabilities

- `production-readiness`: Defines the production configuration contract and the
  deterministic Linux verification required before Acta changes may merge.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-247.
- **Affected systems:** root package scripts, `@acta/config`, Prisma generation,
  GitHub Actions, web production builds, and governance verification manifests.
- **Security:** CI uses explicit non-secret fixtures and a disposable database.
  Validation failures identify variable names and constraints but never values.
  No production credential or paid provider call is required.
- **Cost:** The workflow uses bounded GitHub-hosted CI and free local service
  containers. It introduces no recurring application runtime cost and must fit
  existing CI allowances under the USD 50 monthly project ceiling.
- **Rollback:** Revert the workflow, validator, scripts, and CAI-247 manifest.
  Existing application runtime behavior and deployment configuration remain
  unchanged.
- **Out of scope:** Production deployment, hosted database provisioning,
  repairing Vercel output configuration, and invoking paid external providers.
