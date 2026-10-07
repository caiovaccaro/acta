# Design

## Context

See `proposal.md` for motivation and
`specs/production-readiness/spec.md` for required behavior.

The repository is an npm workspace whose current governance workflow already
runs on Ubuntu with PostgreSQL, but it does not define production configuration
shape or perform a production web build. `@acta/config` validates
`DATABASE_URL` at module import time, reports through console output, and has
placeholder tests. The web build generates Prisma itself and consumes database
and admin-authentication variables.

P1-01 must remain independent of production credentials, paid providers, and
the Vercel output repair assigned to P1-03.

## Goals / Non-Goals

**Goals:**

- Make one side-effect-free schema the source of truth for production variable
  shape and expose a CLI preflight over `process.env`.
- Establish explicit, deterministic commands for unit, integration, E2E, and
  regression verification.
- Verify clean install, Prisma generation, disposable database setup, all
  workspace tests, and the web production build on Ubuntu.
- Keep all diagnostics value-free and all evidence commit-bound.

**Non-Goals:**

- Deploying to Vercel or any other production environment.
- Provisioning or migrating a hosted database.
- Verifying real provider credentials or making paid network calls.
- Resolving the web output-directory contract tracked by P1-03.

## Decisions

### 1. Separate schema evaluation from process startup

`@acta/config` will export a production schema evaluator that accepts an
explicit key/value object and returns structured issues. The CLI adapter alone
will read `process.env`, format variable names plus constraints, and select a
non-zero exit status.

The initial required production contract is:

- `NODE_ENV` must equal `production`.
- `DATABASE_URL` must be a PostgreSQL URL.
- `ADMIN_EMAIL` must be a syntactically valid email address.
- `ADMIN_PASSWORD` must be non-placeholder and at least 16 characters.
- `ADMIN_SESSION_SECRET` must be non-placeholder and at least 32 characters.

Optional provider variables remain outside this base contract until the tickets
that make those providers production requirements. If present, values are not
echoed.

This design avoids import-time process termination in tests and permits
deterministic fixtures. The alternative—validating only in each application
entry point—would duplicate constraints and leave build-time behavior
inconsistent.

### 2. Use committed, obviously synthetic CI fixtures

Linux CI will pass synthetic environment values directly at job or step scope
and start PostgreSQL 16 as a service container. It will generate Prisma and use
`prisma db push --skip-generate` against the disposable database because the
historical migration chain is not currently valid for a blank database;
repairing that chain is outside P1-01.

No repository or environment secret is required for the Linux verification
job. Paid-provider variables are omitted so accidental calls fail closed.

The alternative—using repository secrets—would prevent fork-safe verification
and would expand the trust boundary without testing configuration shape more
effectively.

### 3. Keep one canonical Linux command graph

Root package scripts will name the four verification classes. The CAI-247
manifest will reference those exact scripts, and the Linux workflow will invoke
the same manifest-backed readiness path with an authenticated Linear read in
protected PR CI. Lower-level integration and E2E scripts remain runnable with
fixtures for local verification.

The E2E command owns production configuration preflight and `npm run build
--workspace @acta/web`. Regression owns the complete workspace test suite.
Unit owns schema and redaction behavior. Integration owns the clean Prisma and
disposable PostgreSQL path.

This avoids a CI-only shell sequence drifting from `verify:pr-ready`. A separate
workflow remains useful because it exposes Linux build readiness as a visible,
bounded check rather than hiding it inside unrelated governance diagnostics.

### 4. Treat logs and reports as an untrusted output boundary

Configuration values enter only the schema evaluator. Errors leave that
boundary as stable issue codes, variable names, and public constraint
descriptions. Tests use sentinel secrets and assert that neither direct output
nor serialized errors contain them.

The commit-bound report records commands, statuses, hashes, and the Git commit;
it does not record process environments or command output on success.

### 5. Bound CI cost and execution

The workflow uses one Ubuntu job, one PostgreSQL service, npm caching, and a
30-minute timeout. It performs no paid API request. Concurrency cancellation
will stop superseded runs for the same pull request.

Splitting every package into a matrix was rejected because this hobby project
benefits more from low setup overhead and predictable free-tier consumption
than package-level parallelism.

## Control Flow

```text
pull request commit
        |
        v
checkout reviewed SHA -> setup Node -> npm ci
        |
        v
synthetic env -> production config preflight
        |                    |
        | invalid            | valid
        v                    v
value-free failure      Prisma generate
                             |
                             v
PostgreSQL service -> disposable schema -> workspace tests
                                              |
                                              v
                                      production web build
                                              |
                                              v
                                  commit-bound readiness report
```

## Trust Boundaries

- **GitHub event and repository contents:** Untrusted change input. Workflow
  permissions remain read-only and checkout is pinned to the reviewed commit.
- **Linear:** Read-only requirement source accessed only by the governance path;
  responses cannot inject shell commands.
- **CI fixtures:** Public synthetic values suitable for logs and forks. They
  must never be replaced by production credentials.
- **PostgreSQL service:** Disposable per-job state with no route to production.
- **Configuration diagnostics:** Public output boundary restricted to variable
  names, issue codes, and constraints.

## Failure Modes and Recovery

- Invalid configuration fails before Prisma, tests, or build and identifies the
  exact variable names to correct.
- Dependency or Prisma generation failure stops the job and can be reproduced
  with the canonical command on a clean checkout.
- PostgreSQL health failure prevents schema preparation and all database tests.
- Any package test or web build failure fails the readiness command, so no
  commit-bound success report is emitted.
- A superseded pull-request run is cancelled; the latest commit starts a fresh
  verification.
- Transient GitHub runner failure is recovered by rerunning the same commit.

## Test Mapping

- **Unit:** Missing, malformed, weak, placeholder, and cross-field production
  variables produce stable value-free issues; valid fixtures pass.
- **Integration:** Prisma generation, disposable PostgreSQL setup, and every
  workspace test package complete from canonical commands.
- **E2E:** A clean Linux-equivalent invocation validates synthetic production
  configuration, builds the web app, and emits a commit-bound report.
- **Regression:** The existing complete workspace test suite remains green.
- **Policy:** Workflow tests reject write permissions, production secret
  dependencies, paid-provider variables, unbounded timeouts, or divergence from
  canonical scripts.

## Risks / Trade-offs

- [The historical migration chain cannot initialize a blank database] →
  Continue using disposable `db push` in CI and leave migration repair to the
  hosted-database work.
- [Production variable requirements will grow in later tickets] → Keep the
  schema composable and add provider-specific requirements only when those
  capabilities become mandatory.
- [A real Linux runner differs from local macOS verification] → Require the
  GitHub-hosted Ubuntu check before merge and keep local tests as fast feedback.
- [Web build may expose the known Vercel output issue] → Verify that Next.js can
  build without claiming deployment correctness; P1-03 remains authoritative
  for Vercel output.
- [Extra CI consumes free-tier minutes] → Use one bounded job, caching, and
  concurrency cancellation.

## Migration Plan

1. Add schema, CLI, synthetic fixtures, and value-leak tests.
2. Add canonical root scripts and the CAI-247 verification manifest.
3. Add Linux workflow and policy tests.
4. Run the complete local verification loop.
5. Open the PR and require Linux, governance, and adversarial checks.

Rollback is a normal revert of these additions. No database or production state
is changed, so rollback requires no data migration.
