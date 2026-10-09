# Vercel monorepo deployment

## Supported contract

The Vercel project root is the repository root. Both preview and production use:

- install: `npm ci`
- build: `npm run build:vercel`
- framework: Next.js
- output: `apps/web/.next`

`apps/web/next.config.js` leaves `distDir` unset, so Next.js writes its standard
app-local `.next` output. `npm run build:vercel` validates P1-01 production
configuration and this path contract before Prisma generation or Next.js work.
Any validation or build failure stops the candidate deployment; Vercel keeps
the prior promoted deployment available.

## Redacted deployment evidence

GitHub's Vercel deployment status identifies:

- PR #40 preview `dpl_Fb5oPrRhtht8c7KUSwRp7xFVhNjJ` as failed on 2026-10-07.
- Main deployment `dpl_7vd36KepQnVuuihPfRCnof9RD6LC` as failed on 2026-10-08.
- The preview status directs maintainers to
  `npx vercel inspect dpl_Fb5oPrRhtht8c7KUSwRp7xFVhNjJ --logs`.

Authorized inspection of failed deployment
`dpl_Fb5oPrRhtht8c7KUSwRp7xFVhNjJ` produced these decisive redacted lines:

```text
Error: The Next.js output directory "apps/web/.next" was not found at "/vercel/path0/apps/web/.next".
The "Output Directory" setting in your project is misconfigured.
```

The root cause was an output-contract mismatch: `vercel.json` expected
`apps/web/.next`, while `apps/web/next.config.js` set `distDir: '../../.next'`
and wrote the output to the repository-root `.next`. The app now uses Next.js's
standard app-local output, and the validator prevents this drift from recurring.

Never copy tokens, environment values, private URLs, or unredacted response
bodies into this document, OpenSpec artifacts, governance reports, or PR text.

## Local reproduction

From a clean checkout:

```sh
npm ci
npm run db:generate
NODE_ENV=production \
DATABASE_URL='postgresql://fixture:fixture@127.0.0.1:5432/acta' \
ADMIN_EMAIL='admin@example.invalid' \
ADMIN_PASSWORD='synthetic-password-123' \
ADMIN_SESSION_SECRET='synthetic-session-secret-1234567890' \
NEXT_TELEMETRY_DISABLED=1 \
npm run build:vercel
```

Canonical verification:

```sh
npm run test:p1-03:unit
npm run test:p1-03:integration
npm run test:p1-03:e2e
npm run test:p1-03:regression
npx openspec validate p1-03-vercel-monorepo-output --strict --no-interactive
```

## Preview smoke

Use public representative record IDs; do not pass application credentials or
cookies:

```sh
npm run deploy:smoke -- \
  --base-url=https://preview.example.vercel.app \
  --topic-id=PUBLIC_TOPIC_ID \
  --question-id=PUBLIC_QUESTION_ID
```

For a preview protected by Vercel Authentication, use the authenticated local
Vercel CLI as the transport. This accepts no token argument and never prints the
CLI's deployment-protection bypass:

```sh
npm run deploy:smoke -- \
  --base-url=https://preview.example.vercel.app \
  --topic-id=PUBLIC_TOPIC_ID \
  --question-id=PUBLIC_QUESTION_ID \
  --transport=vercel \
  --timeout-ms=600000
```

The command performs exactly five GET requests: `/api/health`, `/`, the topic,
the question, and `/admin/login`. It checks public statuses and markers only.
The Vercel transport runs those bounded requests concurrently so CLI
authentication latency cannot multiply across routes. Run it once per candidate
preview to remain within Vercel Hobby limits.

CAI-248 preview `dpl_9zaS3Zhos2UnZSaPSWHATXePJdmq` reached `Ready` on
2026-10-08. The protected-transport smoke passed all five routes with HTTP 200
using topic `c880a14b-ad3c-4438-b08e-4349b4e2910a` and question
`a7961122-ce49-469b-a20e-224f44b4cd1c`; `/api/health` also reported the
database connected. No application credential, bypass token, or cookie was
recorded.

## Recovery

1. Inspect the candidate deployment logs with authorized read-only Vercel
   access and record only decisive redacted lines.
2. Reproduce with the canonical integration command.
3. Correct environment or output configuration and push a new commit.
4. Wait for the new preview, run the five-route smoke, then allow promotion.

Do not promote around a failed build or smoke run. No database migration or
pipeline schedule is part of this recovery.
