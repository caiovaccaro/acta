# Tasks

## 1. Production configuration contract

- [x] 1.1 Refactor `@acta/config` into side-effect-free environment parsing plus runtime exports and verify existing consumers and config tests still pass
- [x] 1.2 Implement the production schema and CLI with stable variable-name/constraint diagnostics and verify unit cases for missing, malformed, weak, placeholder, and valid values
- [x] 1.3 Add sentinel-secret assertions and fixture documentation and verify no error, log, or serialized result exposes submitted values

## 2. Canonical verification commands

- [x] 2.1 Add explicit CAI-247 unit, integration, E2E, and regression scripts and verify each command is runnable independently
- [x] 2.2 Implement the disposable PostgreSQL and Prisma integration path and verify generation, schema preparation, and every workspace test package pass without production credentials
- [x] 2.3 Implement the E2E production preflight and web-build path and verify synthetic configuration produces a successful build without paid-provider calls
- [x] 2.4 Add the CAI-247 verification manifest and Linear fixture and verify `verify:pr-ready` consumes all four canonical commands

## 3. Linux CI enforcement

- [x] 3.1 Add the bounded, read-only Ubuntu workflow with npm caching, PostgreSQL 16, synthetic configuration, and concurrency cancellation and verify `actionlint` passes
- [x] 3.2 Extend workflow policy tests to reject write permissions, production secret dependencies, paid-provider variables, missing timeouts, or divergence from canonical commands and verify the policy suite passes
- [x] 3.3 Document local reproduction and failure recovery and verify every documented command matches a package script or workflow step

## 4. Integrated acceptance

- [x] 4.1 Run strict OpenSpec validation and confirm all three Given/When/Then scenarios remain synchronized with CAI-247
- [x] 4.2 Run unit, integration, E2E, regression, clean-install, Prisma-generation, and production-web-build loops until all acceptance criteria pass
- [ ] 4.3 Run `/opsx:verify` and commit-bound `verify:pr-ready` for CAI-247 and verify the report contains the reviewed commit and no sensitive values
- [ ] 4.4 Synchronize final artifact hashes and implementation-cost evidence into Linear, move CAI-247 to In Progress during implementation and In Review only when the PR opens, and verify the issue mirror remains consistent
- [ ] 4.5 Open the CAI-247 pull request only after all local gates pass, then verify Linux CI, governance, and adversarial-review checks all pass on its final head

## Workflow follow-up

- Merge only after every required check and validated adversarial finding is resolved.
- Archive the change after the pull request merges and update CAI-247 with final evidence.
