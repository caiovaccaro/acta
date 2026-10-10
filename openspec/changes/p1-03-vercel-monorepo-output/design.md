# Design

## Context

See `proposal.md` for motivation and
`specs/vercel-deployment-readiness/spec.md` for required behavior.

The Vercel project builds from the repository root. `vercel.json` currently
declares `apps/web/.next`, while `apps/web/next.config.js` changes `distDir` to
`../../.next`; those settings describe different directories. P1-01 already
provides a value-safe production environment validator, but Vercel's build
command does not invoke it.

GitHub's deployment record for PR #40 identifies failed preview deployment
`dpl_Fb5oPrRhtht8c7KUSwRp7xFVhNjJ` and instructs running `vercel inspect
<deployment> --logs`. A later main deployment,
`dpl_7vd36KepQnVuuihPfRCnof9RD6LC`, failed the same integration. At planning
time the local Vercel CLI was logged out, no token or auth file existed, the
deployment API returned `403 missingToken`, and the inspector returned a login
boundary. These are redacted access facts, not build-log evidence; the actual
log root cause must remain unverified until authorized access is available.

## Goals / Non-Goals

**Goals:**

- Make the standard app-local `apps/web/.next` directory the sole output
  contract for both preview and production.
- Extend P1-01 preflight so invalid environment or deployment paths stop before
  Prisma generation and Next.js build.
- Exercise the clean production build without local-only state.
- Verify five public routes with one bounded, credential-free smoke process.

**Non-Goals:**

- Changing the database schema or repairing migration history.
- Scheduling deployment or smoke pipelines.
- Testing authenticated admin behavior or submitting credentials.
- Replacing Vercel's atomic promotion and previous-deployment retention.

## Decisions

### 1. Use Next.js's app-local default output

Remove the custom `distDir` and keep Vercel's `outputDirectory` at
`apps/web/.next`. The build continues from the repository root so workspace
packages and Prisma remain resolvable.

This uses Next.js and Vercel's conventional monorepo layout. Moving both to a
repository-root `.next` directory was rejected because it relies on an upward
relative `distDir`, obscures app ownership, and caused the current disagreement.

### 2. Validate configuration before expensive build work

A side-effect-free deployment validator accepts explicit Vercel, Next.js, and
environment inputs. Its CLI loads tracked configuration, resolves the effective
Next.js output (`distDir` or `.next`) relative to `apps/web`, and rejects any
output mismatch or non-production `NODE_ENV`. The Vercel build command invokes
P1-01 production validation and deployment validation before Prisma generation.

Keeping path checks in shell snippets was rejected because unit testing and
platform-independent path normalization would be fragile.

### 3. Keep route smoke deterministic and credential-free

The smoke CLI requires `--base-url`, `--topic-id`, and `--question-id`. It
allows only HTTPS except loopback URLs used by local E2E tests, follows normal
redirects, applies a per-request timeout, and checks one status and marker for
each required route. It never accepts username, password, cookie, or token
arguments.

Automatic data discovery was rejected because it adds API requests and can hide
incorrect representative-route configuration. Fixed public IDs make the
deployment contract explicit and keep each remote run to five requests.

### 4. Separate local E2E from preview evidence

The canonical E2E command runs the smoke engine against a fixture HTTP server,
proving route selection, status handling, marker checks, and secret-free
requests without network or Vercel usage. The same CLI is then run once against
the actual preview URL as deployment evidence.

Local fixtures cannot establish preview health, so tasks and verification notes
distinguish local E2E success from the externally blocked preview run.

## Control Flow

```text
Vercel preview/production build
          |
          v
P1-01 env preflight --> deployment contract validation
          | invalid                 | valid
          v                         v
fail before build          Prisma generate -> Next.js build
                                               |
                                               v
                                    apps/web/.next located
                                               |
                                               v
                                      preview deployment
                                               |
                                               v
five public GET checks -> all markers pass -> eligible for promotion
          |
          +---- any mismatch ----> fail; prior deployment remains available
```

## Trust Boundaries

- **Vercel project settings and environment:** External deployment input.
  Tracked validation checks only required names and path values; secret values
  never enter reports.
- **GitHub deployment metadata:** Read-only evidence identifying commit,
  deployment, state, and public URL. It is not treated as build-log content.
- **Preview HTTP responses:** Untrusted public content bounded by timeout and
  maximum body size before marker matching.
- **Smoke CLI inputs:** Public deployment URL and public record identifiers
  only. The interface intentionally has no credential options.

## Failure Modes and Recovery

- Non-production `NODE_ENV`, missing production variables, or output mismatch
  exits before Prisma or Next.js runs.
- Workspace, Prisma, or prerender errors fail the Vercel build and do not
  promote the broken deployment.
- A missing route, wrong status, marker mismatch, timeout, oversized body, or
  transport error fails smoke with the route name and no response body.
- Vercel log or deployment access denial is reported precisely; local evidence
  must not be relabeled as remote success.
- Recovery is a corrected commit and fresh preview. Vercel retains the prior
  promoted deployment; rollback is a normal Git revert with no data changes.

## Test Mapping

- **Unit:** Production environment and normalized output mismatch cases are
  accepted or rejected deterministically with value-free diagnostics.
- **Integration:** Clean install, Prisma generation, and production Next.js
  build produce `apps/web/.next` without developer-machine paths or prerender
  failures.
- **E2E:** A fixture server receives exactly the five required unauthenticated
  GETs and each expected marker passes.
- **Preview E2E:** The same smoke CLI targets the Vercel preview with explicit
  representative IDs.
- **Regression:** Existing workspace, governance, and P1-01 tests remain green.

## Risks / Trade-offs

- [Vercel project-level settings can override tracked configuration] → Validate
  the effective Git-integrated deployment through preview smoke and inspect
  Vercel's reported output before promotion.
- [Representative IDs can be removed] → Treat missing configured records as a
  smoke failure and update public IDs deliberately rather than discovering
  weaker substitutes.
- [Database availability can make `/api/health` return 503] → Preserve the
  failure because a deployment without its required database is not healthy.
- [Actual deployment logs require account authorization] → Record deployment
  IDs and exact denial, leave the evidence task open, and never infer log
  contents from local reproduction.
- [Extra checks consume Hobby allowance] → Run five GETs once per candidate
  preview with no schedule or browser session.

## Migration Plan

1. Add validators, smoke tooling, tests, and canonical commands.
2. Remove the custom Next.js output override and validate `apps/web/.next`.
3. Run clean local production verification and commit-bound readiness.
4. Push the branch so Vercel creates a preview; inspect logs and run smoke.
5. Fix any build or route mismatch before promotion.

Rollback is a normal revert. Failed builds and smoke checks do not replace the
previously available deployment, and no database migration is involved.
