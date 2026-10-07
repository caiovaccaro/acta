# Linux and production-readiness verification

CAI-247 defines a deterministic, non-deploying verification path for Acta.
Commands use a disposable PostgreSQL database and synthetic configuration; they
must not receive production credentials or paid-provider API keys.

## Production configuration

Validate a production-shaped environment:

```sh
NODE_ENV=production \
DATABASE_URL='postgresql://acta:acta_test_password@127.0.0.1:5432/acta_test?schema=public' \
ADMIN_EMAIL='admin@example.invalid' \
ADMIN_PASSWORD='synthetic-password-123' \
ADMIN_SESSION_SECRET='synthetic-session-secret-1234567890' \
npm run config:validate:production
```

Failures print only variable names and public constraints. They never print
submitted values.

## Local verification

Start a disposable PostgreSQL 16 instance compatible with the URL above, then
run:

```sh
npm ci
npm run test:p1-01:unit
npm run test:p1-01:integration
npm run test:p1-01:e2e
npm run test:p1-01:regression
```

Run the commit-bound governance gate with authenticated read-only Linear access:

```sh
npm run verify:pr-ready -- \
  --issue=CAI-247 \
  --change=p1-01-linux-ci-config-validation
```

For fixture-only local development, set `ALLOW_LINEAR_FIXTURE=1` and append:

```sh
--issue-file=scripts/governance/__tests__/fixtures/cai-247.md
```

The GitHub `linux-ci` job runs the same four class commands on Ubuntu after
`npm ci`. Governance and adversarial review remain separate protected checks.

## Failure recovery

- Configuration failure: correct only the named variables and rerun the
  preflight.
- PostgreSQL health failure: restart the disposable service and rerun the
  integration command.
- Prisma failure: rerun `npm run db:generate`, then recreate the disposable
  schema with `cd modules/db && npx prisma db push --skip-generate`.
- Package test or web build failure: reproduce with its canonical command; no
  readiness report is written until all commands pass.
- Superseded CI run: no action is required because concurrency cancellation
  starts a fresh run for the latest pull-request commit.

Production deployment, hosted migrations, and Vercel output repair are outside
this verification path.
