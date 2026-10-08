# Bounded crawler slice runbook

CAI-246 makes every production crawler invocation a finite slice. Operators
must supply a non-negative article cap either as `--max-articles` or through
`MAX_ARTICLES_PER_RUN`. No value means failure; zero means validation only and
performs no database or network writes.

## Run a slice

```bash
npm run crawler:start -- --max-articles=25
npm run crawler:start -- --max-articles=10 --outlets "BBC" "Reuters"
npm run crawler:start -- --max-articles=0 --outlets "BBC"
```

Outlet matching is case-insensitive and exact. Comma-separated values are also
accepted (`--outlets=BBC,Reuters`). An invalid, duplicate, or ambiguous name
fails before stale-claim recovery, RSS fetching, or database writes and lists
the available canonical names.

Successful output is one JSON object:

```json
{
  "selectedOutlets": ["BBC"],
  "maxArticles": 10,
  "discovered": 14,
  "claimed": 10,
  "completed": 9,
  "failed": 1,
  "remaining": 4
}
```

`claimed` and `completed` never exceed `maxArticles`. `remaining` includes
pending, failed, or in-progress requests for the selected outlets. Failed work
can be re-enqueued by RSS within the existing retry limit; interrupted
in-progress work becomes pending through stale-request recovery on a later
non-zero run.

## Browserless boundary

The production command fetches RSS and free article HTML through
`CheerioCrawler`. It has no direct Playwright dependency and installs or
launches no Chromium binary. Paywalls, authenticated sessions,
JavaScript-rendered extraction, Tavily, and article analysis require separate
changes.

## Verification

Run commands independently against disposable PostgreSQL:

```bash
npm run test:p1-02:unit
npm run test:p1-02:integration
npm run test:p1-02:e2e
npm run test:p1-02:regression
npx openspec validate p1-02-crawler-caps-outlet-filtering --strict --no-interactive
ALLOW_LINEAR_FIXTURE=1 npm run verify:pr-ready -- \
  --issue=CAI-246 \
  --change=p1-02-crawler-caps-outlet-filtering \
  --issue-file=scripts/governance/__tests__/fixtures/cai-246.md
```

The integration and E2E commands generate Prisma and push the schema to the
database identified by `DATABASE_URL`. Use only a disposable local or CI
database.

## Failure recovery

- Correct invalid cap or outlet input and rerun; no writes occurred.
- For a fixture HTTP or transient extraction failure, rerun the same bounded
  command. Pending requests were never claimed beyond the cap, failed requests
  retain retry state, and interrupted requests are recovered after the stale
  threshold.
- If a check fails, keep its disposable database for inspection, fix the
  underlying code or fixture, recreate the schema, and rerun that canonical
  command.
- Never point verification commands at production PostgreSQL and never add a
  browser install as a recovery step.
