# CAI-245 production validation audit

Audit date: 2026-11-21

## Verified

- `https://acta-live.vercel.app/api/health` returned HTTP 200 and reported `database.status=connected`.
- Public production APIs returned non-empty data: 46 topics and 141 questions.
- Vercel production defines `DATABASE_URL`; its endpoint metadata identifies it as pooled.
- The repository never printed or persisted the URL, record IDs, or row contents.
- Local disposable PostgreSQL 16 recovery passed on host port 55434 with 26 repository migration ledger entries, required tables, bounded counts, and representative fixture IDs.
- Unit, E2E fixture, governance, regression, lint, strict OpenSpec, actionlint, and clean production build verification passed.
- On PR #59 after merging current `main`, Linux CI, governance, and Vercel deployment passed. Adversarial review remained failed because it treats the missing direct Neon URL and resulting absent production restore proof as blocking; no check was weakened or bypassed.

## Definitive production recovery blocker

Vercel production does not define `DIRECT_DATABASE_URL`, `EXPECTED_TOPIC_ID`, or `EXPECTED_QUESTION_ID`. The parent local environment also lacks those variables. Direct client access to the pooled Vercel URL was unavailable from the local verification environment. Therefore CAI-245 did not run a direct read-only migration-ledger inspection, `pg_dump`, or disposable restore from Neon.

No production migration, backup, restore, provisioning, replacement, or data mutation was attempted. To unblock, an authorized operator must store the existing canonical Neon direct endpoint as encrypted `DIRECT_DATABASE_URL` and representative public IDs as encrypted `EXPECTED_TOPIC_ID`/`EXPECTED_QUESTION_ID`, then run:

```sh
npm run db:production:connections
npm run db:production:integrity
npm run db:production:restore-verify
```

The commands fail closed and never print connection values or representative IDs.

## Additional repository migration evidence

A non-production database from the parent local `.env` was inspected only to exercise read-only diagnostics. It contained 30 successful migration ledger entries versus 26 migration directories in this worktree. Four database-only names were reported:

- `$(date +%Y%m%d%H%M%S)_add_context_blurb_to_questions`
- `$(date +%Y%m%d%H%M%S)_add_debate_card_storage`
- `$(date +%Y%m%d%H%M%S)_add_question_redirect`
- `20261004120000_add_outlet_country_code`

This is not Neon production evidence and is not used to claim production integrity. The last entry corresponds to the unrelated untracked migration in the main workspace; that file was not copied, modified, or included in this branch.

## Cost

No paid resource was provisioned and no recurring cost was added. Verification used existing Vercel/Neon service access and disposable local Docker PostgreSQL. Task-attributed Cursor cost is unavailable and is not estimated.
