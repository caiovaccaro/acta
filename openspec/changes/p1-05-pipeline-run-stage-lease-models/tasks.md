# Tasks

## 1. Durable coordination schema

- [x] 1.1 Add Prisma enums and `PipelineRun`, `PipelineStageRun`, `PipelineLease`, and `PipelineLeaseEvent` models with required constraints and state-query indexes, then verify Prisma format and generation succeed
- [x] 1.2 Add one lock-minimal additive migration and verify the full chain applies to an empty PostgreSQL 16 database on host port 55435 without destructive SQL
- [x] 1.3 Apply the migration to a production-like database at the previous schema with representative records and verify existing rows and constraints remain intact
- [x] 1.4 Extend schema regression tests and coordination documentation, then verify model mappings, indexes, lease timing, audit semantics, rollback, and no-secret rules are covered

## 2. State machine and run repositories

- [x] 2.1 Implement the explicit run-transition guard and verify a unit matrix covers every allowed and forbidden source/target pair
- [x] 2.2 Implement run and stage create/read/update repositories with compare-and-set transitions, checkpoint JSON, indexed status queries, and sanitized errors, then verify repository unit tests cover stale writes and redaction boundaries
- [x] 2.3 Export the coordination contracts from `@acta/db` and verify TypeScript/Jest consumers can import generated Prisma and repository types

## 3. Transactional lease lifecycle

- [x] 3.1 Implement singleton-resource acquisition using bounded-retry Prisma serializable transactions and verify contention returns one winner without leaking database internals
- [x] 3.2 Implement owner/run/generation compare-and-set heartbeat and release and verify stale owners cannot mutate a successor's lease
- [x] 3.3 Implement atomic stale takeover with displaced owner/run audit events and verify takeover keeps exactly one current owner
- [x] 3.4 Add concurrent real-PostgreSQL integration tests for acquire, heartbeat, release, ownership loss, and stale reclaim, then verify ownership remains singular and auditable

## 4. Competing process boundary

- [x] 4.1 Add a synthetic protected-operation runner and two-process synchronization harness that uses only the lease repository, then verify only an acquired process can insert the fixture mutation
- [x] 4.2 Add the E2E test that starts two runner processes together and verify exactly one performs work while the loser exits successfully without mutation
- [x] 4.3 Add CAI-252 unit, integration, E2E, and regression scripts plus local Docker PostgreSQL instructions, then verify every documented command is independently runnable on host port 55435

## 5. Governance and integrated acceptance

- [x] 5.1 Add the synchronized CAI-252 Linear fixture and commit-bound verification manifest and verify all three ticket Given/When/Then scenarios match the delta spec exactly
- [x] 5.2 Run clean install, Prisma generation, empty and production-like migration checks, unit, concurrent integration, competing-process E2E, regression, full relevant suite, production build, strict OpenSpec, actionlint, and lints in a fix loop until all pass
- [ ] 5.3 Run `/opsx:verify` and commit-bound `verify:pr-ready` for CAI-252 and verify the report contains the reviewed commit, artifact hashes, exact commands, honest unavailable task-attributed Cursor cost, and no sensitive values
- [ ] 5.4 Synchronize final evidence to Linear, open the comprehensive pull request only after local gates pass, move CAI-252 to In Review, and verify the PR body explains merge effects, design, migration safety, evidence, cost, and rollback
- [ ] 5.5 Loop Linux CI, governance, adversarial review, and Vercel checks on the final head until all pass, resolving every actionable finding without merging

## Workflow follow-up

- Merge only after every required check and validated adversarial finding is resolved.
- Archive the change after the pull request merges and update CAI-252 with final evidence.
