# Canonical Neon production database and recovery

## Ownership and safety contract

The existing Neon project used by Vercel is Acta's canonical production database. Never provision or restore into a replacement production database as part of this workflow. Production inspection is read-only, production migrations are never implicit, and connection values remain only in encrypted Vercel/GitHub/local environments.

- `DATABASE_URL`: pooled Neon endpoint used by application runtime and read-only integrity checks.
- `DIRECT_DATABASE_URL`: direct Neon endpoint used only by explicitly controlled migration, logical backup, and recovery operators.
- `EXPECTED_TOPIC_ID` and `EXPECTED_QUESTION_ID`: representative public record identifiers stored in encrypted verification environments.
- Never enable shell tracing, print environment values, paste URLs into PRs/reports, or commit backup files.

Validate role metadata and inspect production without writes:

```sh
npm run db:production:connections
npm run db:production:integrity
```

The integrity command begins a read-only transaction and checks `topics`, `questions`, `_prisma_migrations`, exact successful repository migration names, bounded counts, and representative IDs. It reports contract names and aggregate counts only.

Measured 2026-10-10 read-only inspection of canonical Neon, using a public topic/question ID and the existing encrypted runtime URL, failed closed on migration-state drift: the repository currently contains 26 migration directories while Neon reports 30 successful `_prisma_migrations` rows. Topic/question counts on the live Vercel app were 46 and 141. Do not run `db:production:migrate` to "fix" this. Reconcile names in the Neon console without recording credentials, then treat any production migration as a separately approved decision. The local encrypted environment does not currently contain `DIRECT_DATABASE_URL`; live logical dump/restore remains blocked until that direct role is available. Disposable PostgreSQL restore verification on host port 55434 is the repository-tested recovery path.

## Controlled migration

No build, test, preview, restore, or CI command runs production migrations. A separately approved operator action requires the direct URL and exact issue acknowledgement:

```sh
ALLOW_PRODUCTION_MIGRATION=CAI-245 npm run db:production:migrate
```

CAI-245 does not authorize running that command against production. If a future approved migration fails, stop; do not retry blindly, reset, or use `db push`. Preserve canonical Neon, inspect Prisma/Neon state read-only, and make recovery a separate reviewed decision.

## Logical backup and restore verification

Prerequisites are Docker, encrypted `DIRECT_DATABASE_URL`, `EXPECTED_TOPIC_ID`, and `EXPECTED_QUESTION_ID`. The command uses PostgreSQL 16 tools, writes a mode-0600 custom-format backup only inside a mode-0700 temporary directory, restores into disposable PostgreSQL on unique host port 55434, reuses the read-only integrity checks, and destroys both container and backup:

```sh
npm run db:production:restore-verify
```

Do not redirect output to a secret-bearing debug log. Do not commit or upload the backup. For a real incident, create a new encrypted backup artifact, verify it locally first, record timestamps/size/check results without URLs or row contents, and require an explicit cutover decision. Rollback means keeping traffic on the original canonical Neon project; repository rollback is a normal revert and does not mutate database state.

## Provider recovery evidence

Before relying on provider recovery, verify in the Neon console without recording connection values:

- project/branch identity and region;
- measured database size and logical backup duration;
- pooled and direct endpoint roles;
- current provider backup/PITR retention;
- earliest recoverable timestamp and measured RPO/RTO constraints.

Neon free-tier capabilities can change. Logical backup/restore is the repository-tested recovery path. If required retention or RPO is unavailable on the free tier, document the measured limitation and seek explicit approval before any paid upgrade. The service has a hard USD 50 monthly ceiling; this change adds no recurring cost.

## Vercel runtime evidence

After deployment, verify a credential-free HTTPS URL:

```sh
npm run db:production:vercel -- --base-url=https://DEPLOYMENT_HOST
```

The check requires health to report `database.status=connected` and the public topics/questions APIs to return non-empty arrays. It records only aggregate counts.
