# Proposal

## Why

CAI-246 fixes the primary crawler's unbounded extraction path and its
undefined outlet-selection state. Without deterministic outlet resolution and
a mandatory production cap, one scheduled slice can write outside its intended
scope, consume excessive resources, or strand work in non-retryable states.

## What Changes

- Add explicit crawler arguments for selected outlets and the exact maximum
  number of article extractions, including a valid zero-work boundary.
- Resolve requested outlets before any RSS, crawl-request, or article write and
  reject unknown or ambiguous names.
- Atomically claim at most the remaining extraction allowance from only the
  selected outlets, then return structured discovered, claimed, completed,
  failed, and remaining counts.
- Keep failed or interrupted extraction work retryable and guarantee that
  successful persisted extractions never exceed the slice cap.
- Make the production crawler static-HTTP/Cheerio-only and remove Playwright
  from its production dependency scope.
- Add canonical unit, integration, end-to-end, and regression commands plus
  commit-bound verification evidence for CAI-246.

## Capabilities

### New Capabilities

- `bounded-crawler-slices`: Defines deterministic outlet selection, mandatory
  extraction caps, retry-safe claiming, structured run results, and the
  browserless production crawler boundary.

### Modified Capabilities

None.

## Impact

- **Linear issue:** CAI-246; depends on merged CAI-247 / P1-01.
- **Affected systems:** the existing crawler CLI, RSS ingestion, PostgreSQL
  crawl-request claiming, article extraction, crawler package dependencies,
  tests, runbook documentation, and governance verification manifests.
- **Security:** Invalid outlet input fails before writes. Production execution
  does not load browser binaries, paywall sessions, production secrets, or paid
  provider credentials. Logs and fixtures contain no private addresses or
  secrets.
- **Cost:** Bounded slices limit database and network work. Fixture tests use
  local HTTP and disposable PostgreSQL and make no paid API calls. No recurring
  infrastructure is added, preserving the USD 50 monthly ceiling.
- **Rollback:** Revert the CLI, claimant, crawler orchestration, dependency,
  tests, documentation, and CAI-246 artifacts. Any pending or recovered
  in-progress requests remain in PostgreSQL for the prior worker to retry; no
  schema or destructive data rollback is required.
- **Out of scope:** Analysis, Tavily, paid or paywalled outlet sessions,
  JavaScript-rendered extraction, Vercel, and production deployment.
