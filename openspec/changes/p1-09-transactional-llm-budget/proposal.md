# Proposal

## Why

CAI-253 stops concurrent or long-running LLM work from exceeding a log-only
monthly budget by reserving conservative cost before each paid request.

## What Changes

- Add `LlmBudgetReservation` with reserved, settled, and expired states.
- Reserve conservative per-operation estimates under a USD 30 application
  ceiling that untrusted CLI input cannot raise.
- Settle actual usage after success and expire abandoned reservations only
  after the owner lease is stale.
- Pause paid stages when a reservation is rejected while deterministic stages
  continue, reporting `paused_budget`.
- Add unit, concurrent integration, budget-exhaustion E2E, and regression tests.

## Capabilities

### New Capabilities

- `transactional-llm-budget`: Serializable monthly reservations, settlement,
  expiry, and slice pause-on-exhaustion.

### Modified Capabilities

- `pipeline-run-slice`: Paid stages pause on budget exhaustion; deterministic
  stages continue; summaries report remaining budget.

## Impact

- **Linear issue:** CAI-253.
- **Affected systems:** Prisma schema, budget repository, OpenAI provider
  reserve/settle hooks, slice runner, Linux CI, and pipeline docs.
- **Security:** Ceiling cannot be raised by CLI flags. Arithmetic uses fixed
  precision. No prompts or keys are stored on reservations.
- **Cost:** Tests use disposable PostgreSQL and mocked or skipped provider
  calls. Production ceiling is USD 30.
- **Rollback:** Revert application code. Leave the additive table until a
  reviewed cleanup migration is authorized.
- **Out of scope:** Provider billing configuration.
