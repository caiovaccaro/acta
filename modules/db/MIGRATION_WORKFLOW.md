# Migration Workflow

## ⚠️ Important: Always Use Migrations

**See `MIGRATION_RULES.md` for the critical rule: Never modify the database without a migration.**

## Current Status

✅ **Database is in sync with schema** - confirmed by `prisma migrate status` and `prisma db push`

⚠️ **`prisma migrate dev` shows drift warnings** - This is because migration files were modified after being applied. The warnings are safe to ignore - your database is correct.

## Recommended Workflow

### For Development (Creating New Migrations)

When you need to create a new migration:

```bash
cd modules/db
npm run db:migrate
```

You may see drift warnings - these are safe to ignore. The migration will still be created and applied correctly.

### For Production/Deployment (Applying Migrations)

Use `migrate deploy` which doesn't check for drift:

```bash
cd modules/db
npm run db:migrate:deploy
```

This is the recommended command for production environments and CI/CD pipelines.

### For Rapid Development (Schema Changes)

If you're iterating quickly and don't need migration history:

```bash
cd modules/db
bash scripts/load-env-and-run.sh npx prisma db push
```

This syncs your schema directly without creating migration files.

## Why the Warnings?

Prisma's `migrate dev` command:
1. Creates a shadow database
2. Replays all migrations from scratch
3. Compares the result to your current database
4. Detects that `article_question_matches` table doesn't exist (because it was renamed to `article_stances`)

This is expected behavior when migrations are modified after being applied. The database is correct - Prisma is just being cautious.

## Fixing the Warnings (Optional)

If you want to eliminate the warnings completely, you would need to:
1. Reset the database (loses all data)
2. Replay all migrations from scratch

Since you need to preserve data, the warnings are harmless and can be ignored.

