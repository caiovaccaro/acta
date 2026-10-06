---
name: "/opsx:verify"
description: Verify an OpenSpec implementation before pull-request creation
---

Verify the named OpenSpec change against its Linear issue and implementation.

1. Run `openspec status --change "<change>" --json` and read every returned
   context artifact.
2. Run `openspec validate "<change>" --strict --no-interactive`.
3. Read the change's `verification.json` and verify that it declares unit,
   integration, E2E, and regression commands.
4. Compare the implementation diff with every requirement, scenario, acceptance
   criterion, task, trust boundary, failure mode, and rollback decision. Report
   missing, contradictory, or unsupported behavior as blocking.
5. Run every command declared by `verification.json`.
6. Confirm the Linear issue has no unresolved open questions and its change ID
   and Given/When/Then scenarios match the delta specs.
7. Confirm no secret or private destination appears in tracked files, reports,
   logs, or fixtures.
8. Emit PASS only when every check succeeds for the current commit. Otherwise
   emit FAIL with concrete evidence and required fixes. Never waive a failure.

After PASS, run the commit-bound gate:

```sh
npm run verify:pr-ready -- --issue=<linear-identifier> --change=<change>
```

Do not create a pull request unless both verification steps pass.
