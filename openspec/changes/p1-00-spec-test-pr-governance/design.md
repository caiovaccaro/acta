# Design

## Context

See `proposal.md` for motivation. The repository has workspace-specific Jest
suites but no specification gate, GitHub workflow, pull-request template, or
branch protection. Linear is external and must be treated as an untrusted,
authenticated input.

## Goals / Non-Goals

**Goals:**

- Make pre-PR readiness deterministic, fail-closed, and reproducible locally.
- Keep the Linear issue and OpenSpec scenario mirror machine-verifiable.
- Bind test and specification evidence to the exact Git commit.
- Make adversarial review a required, stale-on-new-commit GitHub check.
- Keep permissions, provider usage, and secret exposure minimal.

**Non-Goals:**

- Replace workspace test runners.
- Let CI mutate Linear workflow state.
- Automatically fix or dismiss adversarial findings.
- Implement downstream Phase 1 product behavior.

## Control Flow

```text
Linear issue (read-only API)       repository OpenSpec + verification manifest
             \                                  /
              \                                /
               +--> verify:pr-ready ----------+
                         |
                         +--> strict OpenSpec validation
                         +--> mirror comparison
                         +--> unit/integration/E2E/regression commands
                         +--> commit-bound JSON report
                                      |
                                      v
                              pull request allowed
                                      |
                    +-----------------+------------------+
                    |                                    |
              governance CI                    adversarial-review
                    |                                    |
                    +------------ branch protection -----+
```

## Decisions

### Repository manifest declares verification

Each OpenSpec change owns a `verification.json` containing the Linear issue,
required sections, and one command per test class. This keeps policy generic
while making every change's evidence explicit. Hard-coded ticket logic and
free-form command discovery were rejected because they are difficult to audit.

### Node-based fail-closed validator

The validator uses only Node standard-library APIs for orchestration and the
Linear GraphQL request. Tests inject fixture descriptions or a mock HTTP server.
Missing credentials, malformed responses, divergent scenarios, dirty evidence,
or non-zero child commands fail readiness. A permissive warning mode was
rejected because it could create a PR without evidence.

### Scenario mirroring uses normalized Given/When/Then clauses

The validator extracts explicit GIVEN, WHEN, and THEN clauses from the Linear
description and delta specs, normalizes whitespace and Markdown, and requires
the sets to match. Prose outside the normative scenarios may differ. Comparing
entire Markdown documents was rejected because formatting-only changes would
block work.

### OpenAI provides bounded adversarial review

The selected provider is OpenAI through a repository-owned script. The required
check is named `adversarial-review`. It receives the issue specification,
OpenSpec artifacts, and bounded PR diff, then returns structured findings. One
request runs per head commit with configurable model and input limits. A missing
key, malformed response, confirmed blocking finding, or stale result fails the
check. This reuses the project's provider account and avoids another paid
service. Non-blocking AI summaries were rejected because they do not enforce
the ticket.

### GitHub controls merge; Linear records workflow

CI has read-only repository access and does not update Linear. The working agent
moves the ticket through `To Do`, `In Progress`, `In Review`, and `Done` only
after the corresponding event. This avoids granting write credentials to
untrusted pull-request code.

## Trust Boundaries

- Linear descriptions and API responses are untrusted data and are parsed, not
  executed.
- Manifest commands are reviewed repository code and run only from the checked
  out commit.
- Pull-request diffs are untrusted model input and cannot alter the system
  prompt or workflow permissions.
- `LINEAR_API_KEY` and `OPENAI_API_KEY` exist only as encrypted environment
  secrets and are redacted from output.
- Fork pull requests cannot access secrets and therefore cannot satisfy the
  protected checks until reviewed through a trusted branch.

## Test Mapping

- Unit: manifest and Markdown validation, scenario normalization, missing
  section and failing-command behavior.
- Integration: mocked Linear GraphQL success, divergence, malformed response,
  authentication failure, and redaction.
- End-to-end: disposable git repository runs an incomplete then compliant
  change through the complete readiness gate; branch-protection verification is
  exercised against a disposable GitHub test PR when credentials are available.
- Regression: existing workspace suites run through the declared regression
  command.

## Risks / Trade-offs

- [Linear API/schema changes] → isolate the query and validate every response.
- [LLM false positive] → require structured evidence and rerun after fixes;
  confirmed findings have no owner waiver.
- [LLM false negative] → retain deterministic CI, tests, and human GitHub review.
- [Provider cost] → one bounded low-cost-model request per head commit and no
  automatic retry storm.
- [Secret unavailable on forks] → fail protected checks and use a trusted branch
  after human review.
- [Branch settings drift] → provide an idempotent configuration script and an
  audit command that fails on missing required checks.

## Migration Plan

1. Land OpenSpec, validator, templates, workflows, tests, and runbook.
2. Add read-only Linear and OpenAI secrets to the GitHub environment.
3. Open a disposable test PR and observe `governance` and
   `adversarial-review`.
4. Apply and audit `main` branch protection with both checks required.
5. Close the disposable PR and attach evidence to `CAI-244`.

Rollback removes the required checks before disabling workflows, then reverts
the governance commit. No application data migration is involved.
