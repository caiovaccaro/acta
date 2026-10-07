# Tasks

## 1. OpenSpec and change contract

- [x] 1.1 Initialize repository-local OpenSpec with project governance rules and verify `openspec status --change p1-00-spec-test-pr-governance` recognizes all planning artifacts
- [x] 1.2 Create the `change-governance` delta with mirrored unit, integration, and E2E Given/When/Then scenarios and verify `openspec validate p1-00-spec-test-pr-governance --strict` passes
- [x] 1.3 Add a verification manifest for `CAI-244` with all four test classes and verify its schema with the governance unit suite

## 2. Pre-PR readiness gate

- [x] 2.1 Implement fail-closed manifest, section, change-ID, scenario, and commit-evidence validation and verify missing or malformed inputs fail in unit tests
- [x] 2.2 Implement the read-only Linear GraphQL boundary with fixture injection and redaction and verify synchronized, divergent, malformed, and unauthorized integration cases
- [x] 2.3 Implement command execution and commit-bound JSON reporting and verify any failed test class prevents report creation
- [x] 2.4 Add the `verify:pr-ready` package command and verify an incomplete then compliant disposable repository through the E2E suite

## 3. Pull-request and adversarial governance

- [x] 3.1 Add Linear issue and GitHub pull-request templates and verify required issue, OpenSpec, hash, and test-evidence fields are present
- [x] 3.2 Add read-only governance CI and verify workflow policy tests reject write permissions, unbounded timeouts, or missing checks
- [x] 3.3 Implement bounded OpenAI adversarial review with required check name `adversarial-review` and verify mocked pass, blocking finding, malformed response, and missing-secret cases
- [x] 3.4 Add branch-protection apply/audit tooling and runbook and verify a disposable fixture rejects missing checks and accepts the required set

## 4. Integrated verification

- [x] 4.1 Run unit, integration, E2E, and existing workspace regression suites until all pass
- [x] 4.2 Run strict OpenSpec validation and implementation verification, then produce a successful commit-bound `verify:pr-ready` report for `CAI-244`
- [ ] 4.3 Verify a disposable GitHub test PR receives governance and adversarial results, apply/audit `main` branch protection, and attach evidence to `CAI-244`
- [ ] 4.4 Synchronize final OpenSpec hashes and evidence into Linear, move `CAI-244` to In Review when its PR opens, and verify the issue mirror remains consistent

## Workflow follow-up

- Archive the change after the pull request merges.
- Move `CAI-244` to Done only after archive verification succeeds.
