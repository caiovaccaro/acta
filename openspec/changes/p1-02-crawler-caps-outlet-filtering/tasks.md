# Tasks

## 1. Deterministic slice contract

- [x] 1.1 Implement side-effect-free CLI parsing for explicit outlet and max-article arguments, including an exact zero boundary and fail-closed production cap, and verify focused unit tests pass
- [x] 1.2 Implement deterministic exact outlet resolution before database or network mutation and verify unknown, duplicate, and ambiguous selections fail with available canonical names
- [x] 1.3 Document the bounded crawler CLI and production safety contract and verify every documented invocation maps to a package script

## 2. Atomic capped claiming

- [x] 2.1 Add a PostgreSQL atomic claimant for selected outlet IDs using row locking and verify zero, selected-only, capped, oldest-first, and concurrent non-overlap cases against disposable PostgreSQL
- [x] 2.2 Convert claimed rows to Cheerio article requests without re-querying or widening outlet scope and verify structured request metadata preserves crawl-request identity
- [x] 2.3 Preserve failed and interrupted request states for bounded retry and verify stale recovery never causes a slice to claim more than its cap

## 3. Browserless crawler orchestration

- [x] 3.1 Replace the undefined outlet state in the primary entry point with the validated resolved set and verify invalid outlets cause no writes
- [x] 3.2 Enforce one slice budget across article claims and completions and return structured selected-outlet, discovered, claimed, completed, failed, and remaining counts
- [x] 3.3 Keep RSS and free article fixture extraction on Cheerio, remove Playwright from production dependency scope, and verify no browser binary or browser import is in the scheduled command graph
- [x] 3.4 Add local RSS/article fixtures above the configured limit and verify the end-to-end crawler persists no more than the cap while leaving remaining work retryable

## 4. Canonical verification and governance

- [x] 4.1 Add explicit CAI-246 unit, integration, E2E, and regression package commands and verify each is runnable independently with disposable PostgreSQL where required
- [x] 4.2 Add the CAI-246 Linear fixture and verification manifest and verify exactly three Given/When/Then scenarios match the OpenSpec delta
- [x] 4.3 Run clean install, Prisma generation, unit, integration, E2E, regression, build, actionlint, and strict OpenSpec loops until all acceptance criteria pass
- [x] 4.4 Run `/opsx:verify` and commit-bound `verify:pr-ready` for CAI-246 and verify the report names the reviewed commit without sensitive values
- [x] 4.5 Record implementation duration plus unavailable task-attributed Cursor usage, external API cost, and incremental infrastructure cost; synchronize final evidence to Linear; and verify CAI-246 is ready for review
- [x] 4.6 Open the CAI-246 pull request only after local gates pass, then verify Linux CI, governance, and adversarial-review checks all pass on its final head

## Workflow follow-up

- Merge only after every required check and validated adversarial finding is resolved.
- Archive the change after the pull request merges and update CAI-246 with final evidence.
