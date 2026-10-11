# Proposal

## Why

Linear issue CAI-245 requires a repository-enforced safety and recovery contract for the already-operational Neon production database. The existing Neon project remains canonical; this change validates and protects it without provisioning, replacing, migrating, or mutating production during inspection.

## What Changes

- Define separate pooled runtime (`DATABASE_URL`) and direct migration (`DIRECT_DATABASE_URL`) contracts without exposing values.
- Add read-only production schema, migration, bounded-count, and representative-ID integrity verification.
- Add an explicit, fail-closed controlled migration command that is never invoked by tests, previews, or builds.
- Add logical backup, disposable PostgreSQL restore, and restored-data verification tooling and a recovery runbook.
- Add Vercel health and non-empty public topics/questions verification.
- Add explicit unit, integration, end-to-end, regression, strict OpenSpec, and commit-bound governance evidence.
- Document that rollback removes repository tooling only; it never rolls back, replaces, or mutates the canonical Neon database.

## Capabilities

### New Capabilities
- `production-database-safety`: Production connection, read-only integrity, controlled migration, recovery, and public runtime verification contracts.

### Modified Capabilities

None.

## Impact

Affected areas are database scripts and tests, package commands, Linux CI policy, governance fixtures and manifest, recovery documentation, OpenSpec artifacts, Neon read-only inspection, and Vercel public endpoints. Credentials remain only in encrypted local/cloud environments and values are never logged or committed. The implementation uses the existing Neon free tier and disposable local PostgreSQL on host port 55434; it adds no recurring paid service and must remain within the USD 50 monthly ceiling.

Out of scope are provisioning or replacing Neon, production migration execution, production data mutation, continuous backup beyond provider capabilities, crawler/pipeline execution, and paid database upgrades.
