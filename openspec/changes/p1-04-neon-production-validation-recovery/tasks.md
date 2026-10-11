# Tasks

## 1. Canonical database safety contract

- [x] 1.1 Implement pooled runtime/direct migration variable validation with value-blind diagnostics and verify focused unit tests pass
- [x] 1.2 Implement transaction-level read-only required-table, migration-state, bounded-count, and representative-ID checks and verify focused unit tests pass
- [x] 1.3 Add the fail-closed controlled migration command and policy tests proving no test, preview, build, or CI path invokes it

## 2. Backup and recovery

- [x] 2.1 Add secure logical backup and disposable PostgreSQL restore verification on host port 55434 and verify the integration command succeeds
- [x] 2.2 Document canonical Neon ownership, credential handling, backup, restore, verification, rollback, provider retention/RPO evidence, and free-tier constraints; verify all documented commands exist

## 3. Runtime and governance evidence

- [x] 3.1 Add bounded Vercel health and non-empty topics/questions E2E verification and verify its fixture tests pass
- [x] 3.2 Add explicit unit, integration, E2E, and regression commands plus CAI-245 governance fixture/manifest and verify governance tests pass
- [x] 3.3 Update Linux CI to exercise the CAI-245 contract without production secrets and verify actionlint passes

## 4. Pre-PR verification

- [x] 4.1 Run unit, integration with disposable PostgreSQL on port 55434, E2E, regression, lint, strict OpenSpec, actionlint, and clean production build in a fix loop
- [x] 4.2 Run read-only Neon inspection, logical backup/restore verification, and Vercel runtime/data checks with available encrypted credentials; record non-secret evidence or a precise authorization blocker
- [x] 4.3 Synchronize Linear to In Progress and verify the issue remains aligned with the exact three OpenSpec scenarios
- [ ] 4.4 Commit all implementation and evidence, then run commit-bound `verify:pr-ready` successfully

## 5. Pull request verification

- [ ] 5.1 Push the branch and open a comprehensive PR to `main` with post-merge behavior, exact evidence, rollback, security/cost notes, and honest cost attribution
- [ ] 5.2 Loop Linux CI, governance, adversarial review, Vercel, and deployed runtime/data checks until all pass or a definitive authorization blocker is documented

## Workflow follow-up

- Do not archive this change until the PR is merged.
- Do not merge the PR as part of CAI-245 implementation.
