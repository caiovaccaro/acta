# Design

## Context

See `proposal.md` for motivation and
`specs/bounded-crawler-slices/spec.md` for required behavior.

The production entry point is currently a top-level script. It parses outlet
names with permissive substring matching, resets database state before
validating those names, and later references the undefined `pilotOutlets`
variable. RSS ingestion can enqueue up to 1,000 requests and per-outlet
crawlers each permit 100 requests, so `MAX_ARTICLES_PER_RUN` is not connected
to the active path. Queue selection and status transition are separate database
operations, allowing concurrent workers to select the same pending rows.

P1-01 supplies Linux CI, disposable PostgreSQL, and commit-bound governance.
P1-02 must reuse those foundations without adding a schema migration, browser
runtime, paid network service, or analysis stage.

## Goals / Non-Goals

**Goals:**

- Make argument parsing and outlet resolution pure, deterministic, and
  independently testable.
- Validate the entire requested slice before connecting to mutation paths.
- Enforce one finite cap across claims and successful extraction completions.
- Claim selected requests atomically under concurrent PostgreSQL workers.
- Return stable structured counts and preserve uncompleted work for retry.
- Keep the production package path on static HTTP and Cheerio only.

**Non-Goals:**

- Supporting JavaScript-rendered or authenticated pages.
- Changing article analysis, discovery providers, or downstream pipelines.
- Adding a durable pipeline-run model; that belongs to later sliceability work.
- Repairing historical Prisma migrations or changing the database schema.

## Decisions

### 1. Separate parsing, resolution, and execution

The CLI adapter will accept `--max-articles=<integer>` (or a separated value)
and repeatable/comma-separated `--outlets` values. Parsing returns normalized
input without touching the database. Outlet resolution then performs
case-insensitive exact-name matching against one deterministic, name-sorted
catalog and rejects missing, unknown, duplicate, or ambiguous selections.

The production entry requires `--max-articles`; `MAX_ARTICLES_PER_RUN` is a
supported explicit configuration fallback only when it is a finite
non-negative integer. There is no `null`, unlimited, truthiness, or default-all
cap path. Zero validates outlets and returns a zero-work result without writes.

Substring matching was rejected because `BBC`-style convenience can select a
different set as the catalog changes. Validation after connection was rejected
because startup recovery and RSS ingestion already mutate state.

### 2. Make one orchestrator own the slice budget

The orchestrator processes fixture or configured RSS feeds for resolved
outlets, then passes the exact remaining budget once to the claimant. It does
not create one independent budget per outlet or crawler. Claimed request count
is therefore bounded before Crawlee schedules any article handler.

The run result contains `selectedOutlets`, `maxArticles`, `discovered`,
`claimed`, `completed`, `failed`, and `remaining`. Counts are derived from
database state for the claimed identifiers after Crawlee settles, rather than
assuming every scheduled request completed.

Relying only on Crawlee's `maxRequestsPerCrawl` was rejected because retries,
per-outlet crawler instances, and RSS requests make that setting a different
unit from persisted article extractions.

### 3. Claim with one PostgreSQL transaction and row locks

The repository claimant will select oldest eligible pending rows for the
resolved outlet IDs using `FOR UPDATE SKIP LOCKED`, update exactly those rows to
`in_progress`, increment attempts once, and return them in one transaction.
The query short-circuits on a zero cap or empty outlet set.

Requests not claimed remain `pending`. Handler failures become `failed` and
remain eligible for the existing bounded retry/reset path; interrupted
`in_progress` rows are returned to `pending` by the existing stale-request
recovery at a later run. This change avoids treating existing `in_progress`
rows as fresh selected work.

A Prisma `findMany` followed by `updateMany` was rejected because the gap
permits duplicate claims. Advisory locks were rejected because row locks are
scoped directly to the queue rows and require no separate lock-key protocol.

### 4. Use one Cheerio production extraction path

Resolved free outlets use `CheerioCrawler` for both RSS and article requests.
The direct `playwright` production dependency is removed, and the active entry
point, factory, and package scripts do not import Playwright or install
Chromium. Legacy browser-specific source can remain unreachable until a
separate deletion or migration change, but policy tests prevent it from
entering the production command graph.

Switching to browser extraction on failure was rejected because it would make
cost, credentials, and cap behavior nondeterministic and is explicitly outside
CAI-246.

## Control Flow

```text
CLI argv + environment
        |
        v
parse finite cap + outlet names
        |
        v
load sorted outlet catalog -> exact resolve
        | invalid
        +--------------------> fail, zero writes
        |
        v
cap == 0? -------------------> structured zero-work result
        |
        v
connect -> recover stale claims -> fetch RSS through Cheerio
        |                              |
        |                              v
        |                        pending requests
        v
atomic selected claim (<= cap, SKIP LOCKED)
        |
        v
Cheerio article extraction -> done / failed
        |                         |
        v                         v
query claimed statuses      retry/reset path
        |
        v
structured counts + disconnect
```

## Trust Boundaries

- **CLI/environment:** Untrusted operational input. Numeric and outlet values
  are validated before any mutation or network request.
- **Outlet catalog:** The authoritative allowlist for outbound RSS/article
  hosts in this change. Exact resolved database identifiers cross into claims.
- **RSS/article HTTP:** Untrusted public content parsed as data by Cheerio.
  It receives no browser, session credential, or paid-provider token.
- **PostgreSQL:** Durable queue and article boundary. Claims are transactionally
  bounded; tests use only disposable PostgreSQL.
- **Logs/reports:** Public evidence boundary. They contain names, counts,
  commands, and hashes, never environment values or private addresses.

## Failure Modes and Recovery

- Missing, malformed, negative, or unbounded caps fail before connection.
- Unknown or ambiguous outlets fail before stale recovery, RSS, or writes.
- RSS failure records no extraction claim for that feed; existing pending work
  for other validated feeds can still be claimed within the same cap.
- Concurrent workers skip locked rows and cannot jointly over-claim their
  individual configured slices.
- An extraction failure records `failed`; a process interruption leaves
  `in_progress`, which stale recovery returns to `pending`.
- Result derivation queries persisted status, so partial Crawlee completion is
  reported instead of inflated as success.
- A zero cap performs no recovery, RSS fetch, claim, or article write.

## Test Mapping

- **Unit:** Parse explicit outlet and cap forms, preserve an exact zero boundary,
  reject invalid/unbounded input, and resolve outlets deterministically.
- **Integration:** Seed multiple outlets in disposable PostgreSQL, run concurrent
  capped claims, and prove selected IDs, cap, status, and non-overlap.
- **E2E:** Serve local fixture RSS and static article HTML, execute the real
  Cheerio orchestration above the configured limit, and assert articles are
  capped while remaining crawl requests are retryable.
- **Regression:** Run the existing crawler and workspace suites and a policy
  assertion that the production package path has no direct Playwright
  dependency or browser installation.

## Risks / Trade-offs

- [Exact outlet matching removes permissive aliases] → Print the sorted
  available names on validation failure and require operators to pass canonical
  names.
- [RSS can discover more work than a slice extracts] → Pending rows are cheap,
  durable retry state; extraction writes remain capped.
- [A hard-killed worker temporarily holds `in_progress` rows] → Reuse bounded
  stale recovery before non-zero runs.
- [Raw SQL is database-specific] → Keep it isolated in the PostgreSQL queue
  repository and cover concurrency against disposable PostgreSQL.
- [The Crawlee umbrella contains optional browser adapters transitively] →
  Remove the direct Playwright dependency and verify no browser binary install
  or production import; replacing Crawlee packaging is outside this change.

## Migration Plan

1. Add the argument/resolution contract and atomic claimant with tests.
2. Replace the top-level primary crawler flow with the bounded orchestrator.
3. Remove the direct Playwright production dependency and update the runbook.
4. Run clean install, Prisma generation, disposable-database tests, build, strict
   OpenSpec, policy, and commit-bound readiness.
5. Roll out only through the existing PR checks; do not merge in this change.

Rollback is a normal revert. No schema migration or destructive data operation
is introduced. Pending, failed, or stale in-progress rows remain recoverable by
the previous worker.
