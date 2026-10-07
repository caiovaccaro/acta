# Proposal

Linear issue: `CAI-244`

## Why

Phase 1 work currently has no machine-enforced contract connecting its Linear
specification, repository artifacts, test evidence, pull-request creation, and
merge controls. Establishing that contract first prevents incomplete or
inconsistent changes from entering review.

## What Changes

- Initialize repository-local OpenSpec configuration and change artifacts.
- Add a fail-closed pre-PR verifier that checks Linear/OpenSpec consistency,
  required test classes, strict OpenSpec validation, and commit-bound evidence.
- Add Linear issue and GitHub pull-request templates.
- Add read-only CI checks for specification consistency and test evidence.
- Add a bounded OpenAI adversarial review check named `adversarial-review`.
- Add branch-protection configuration and a disposable test-PR verification
  procedure.
- Add unit, integration, end-to-end, and regression coverage for the governance
  controls.

## Capabilities

### New Capabilities

- `change-governance`: Defines when a Linear/OpenSpec change may enter a pull
  request and when that pull request may merge.

### Modified Capabilities

None.

## Impact

- Adds `@fission-ai/openspec` as a development dependency.
- Adds repository governance scripts, tests, templates, and GitHub Actions
  workflows.
- Requires read-only `LINEAR_API_KEY` and bounded `OPENAI_API_KEY` GitHub
  secrets for their respective checks.
- Requires branch protection on `main` after the checks exist on GitHub.

## Security and Cost

Workflows use least-privilege permissions and never persist provider payloads or
secrets. Adversarial review uses one bounded request per reviewed commit and is
skipped when the required secret is unavailable, which is a failing rather than
passing outcome. Its usage counts toward the existing Phase 1 LLM budget.

## Rollback

Disable the governance workflows, remove their required branch-protection
checks, and revert the governance commit. Existing application behavior and data
are unaffected.

## Out of Scope

- Product pipeline behavior.
- Automatic remediation of adversarial findings.
- Production deployment, crawling, Tavily, email, or moderation behavior.
