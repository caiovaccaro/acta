# Pull-request governance runbook

## Required checks

Protect `main` with these exact status-check contexts:

- `governance`
- `adversarial-review`

Require the branch to be current, require conversation resolution and linear
history, include administrators, and disable force pushes and deletion.

## Secrets

Configure these as GitHub Actions secrets. Never write their values to the
repository, issue, pull request, artifacts, or logs.

- `LINEAR_API_KEY`: read-only access to issue descriptions.
- `OPENAI_API_KEY`: access to the bounded adversarial review request.

Optionally set the `OPENAI_ADVERSARIAL_MODEL` repository variable. The default
is `gpt-4.1-mini`.

## Apply and audit protection

Use an administrator token only in the local process:

```sh
GH_TOKEN=... node scripts/governance/manage-branch-protection.mjs apply
GH_TOKEN=... node scripts/governance/manage-branch-protection.mjs audit
```

The token is not required by pull-request workflows.

## Disposable test-PR procedure

1. Create a temporary branch from `main` containing a deliberately incomplete
   verification manifest and open a PR using the repository template.
2. Verify `governance` fails and merge is unavailable.
3. Correct the manifest and scenario mirror; push the new commit.
4. Verify `governance` passes for the new head SHA.
5. Use the mocked provider test to verify a blocking adversarial finding fails;
   then run the live bounded provider check and verify `adversarial-review`
   passes only when no finding remains.
6. Run the branch-protection audit and capture the PR/check URLs in the Linear
   issue.
7. Close the disposable PR without merging.

Never weaken required checks to make this procedure pass.

## Failure recovery

- Missing Linear/OpenAI secret: restore the secret and rerun the failed job.
- Divergent issue/spec: update the Linear mirror or repository delta, then rerun
  strict validation before pushing.
- Blocking adversarial finding: fix it, rerun every test class, regenerate
  readiness evidence, and push a new commit.
- Provider outage: leave the check failing and retry later; do not waive it.
- Incorrect protection: rerun `apply`, then `audit`.

## Rollback

Before disabling either workflow, remove its required context from branch
protection through GitHub administration. Revert the governance commit only
after merge safety has been restored through an equivalent control.
