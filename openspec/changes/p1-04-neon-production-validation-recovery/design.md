# Design

## Context

See `proposal.md` for motivation. Neon already serves production through Vercel and is the canonical database. The implementation must inspect it without writes, keep connection values outside repository/log output, and prove logical recovery locally without confusing recovery verification with production migration.

## Goals / Non-Goals

**Goals:**
- Make pooled runtime and direct migration roles machine-verifiable by metadata only.
- Use one read-only integrity contract for live Neon and restored PostgreSQL.
- Require an explicit operator acknowledgement before any migration deployment.
- Produce repeatable local/CI evidence and an operator-focused recovery runbook.

**Non-Goals:**
- Database provisioning, provider replacement, production writes, automatic migration, scheduled backup, or paid Neon upgrades.
- Persisting production backup artifacts, credentials, private records, or secret-bearing command output.

## Decisions

### Use separate environment roles and value-blind diagnostics

`DATABASE_URL` is the pooled runtime endpoint and `DIRECT_DATABASE_URL` is the direct administrative endpoint. Validation parses values in memory, verifies PostgreSQL schemes, different hosts, a pooled runtime host, and a non-pooled direct host, but reports variable and rule names only. Using one URL for both roles was rejected because transaction pooling is unsuitable for controlled migration and weakens least privilege.

### Centralize read-only integrity SQL

The integrity command runs transaction-level read-only SQL for required table existence, successful Prisma migration names, bounded topic/question counts, and caller-supplied representative public IDs. The same command targets Neon and restored PostgreSQL. ORM model reads alone were rejected because they cannot reliably expose migration-state drift.

### Put migration behind an explicit fail-closed gate

The controlled command requires `DIRECT_DATABASE_URL` plus the exact acknowledgement `ALLOW_PRODUCTION_MIGRATION=CAI-245`. It then invokes Prisma migration deployment with only the direct URL. No package lifecycle, test, preview, build, restore, or CI command references it. Automatic deployment was rejected because this ticket authorizes no production migration.

### Verify logical recovery in an isolated container

Recovery exports a custom-format logical backup using direct Neon connectivity, starts fresh PostgreSQL 16 on unique host port 55434, restores with ownership/ACL suppression, and runs the shared integrity command. Backup files are mode 0600 in a temporary directory and removed by a trap. The runbook separates backup, restore, verify, cutover, and rollback decisions.

```text
encrypted DIRECT_DATABASE_URL
          |
          v
 pg_dump (read-only) --> 0600 temporary backup
                              |
                              v
                  disposable PostgreSQL :55434
                              |
                              v
                   shared integrity verifier

encrypted DATABASE_URL --> shared verifier (read-only)
Vercel deployment -------> health/topics/questions verifier
```

### Keep production E2E public and bounded

The E2E verifier fetches `/api/health`, `/api/topics`, and `/api/questions`, limits response size/time, and checks only connection status and non-empty arrays. It records counts, not row contents. A browser dependency was rejected because these API contracts need no rendering.

## Risks / Trade-offs

- [A read-only role may lack migration-table visibility] → Fail with the required table name and grant only catalog/table SELECT access; never fall back to a writer.
- [Representative IDs can be rotated] → Supply IDs through encrypted environments and report only which representative contract failed.
- [Logical backup duration can approach free-tier limits] → Run on demand, measure duration/size without storing credentials, and require explicit approval before any paid upgrade.
- [A local restore is not provider PITR] → Document provider retention separately and treat logical restore verification as the tested repository recovery path.
- [PostgreSQL tooling could echo commands] → Disable shell tracing, pass secrets via environment, redact child failures, and never include URLs in reports.

## Migration Plan

1. Merge repository-only contracts and documentation; no production database action occurs.
2. Validate encrypted Vercel/GitHub environment variable roles without printing values.
3. Run read-only integrity against canonical Neon.
4. Create a fresh logical backup and restore it to disposable PostgreSQL on port 55434; verify and destroy it.
5. Verify deployed health and non-empty public data.
6. If repository behavior must be rolled back, revert this change. Do not roll back or replace Neon. If a future explicitly authorized migration fails, stop traffic-changing work, preserve the original Neon project, inspect provider recovery/PITR and the verified logical backup, and require a separate approved recovery decision.

## Test Mapping

- Unit: malformed connection, schema, migration, count, and representative metadata diagnostics are actionable and secret-safe.
- Integration: disposable PostgreSQL migration, backup, restore, and shared integrity checks use host port 55434.
- E2E: Vercel health plus non-empty topic/question APIs.
- Regression: workspace tests, lint, clean production build, strict OpenSpec, actionlint, governance, and commit-bound readiness.

## Open Questions

The Neon region, measured database size, endpoint metadata, provider backup/PITR retention, and achievable free-tier RPO are operational evidence to capture without secret values; they do not change this design.
