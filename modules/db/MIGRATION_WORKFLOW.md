# Migration workflow

Schema changes go through Prisma migrations. See `MIGRATION_RULES.md`.

## Development

```bash
# from repo root
npm run db:migrate
```

This creates a migration from `schema.prisma` and applies it locally.

## Applying existing migrations

```bash
npm run db:migrate:deploy
```

Use this when the migration files already exist (CI, another machine). Set `DATABASE_URL` to the target database.

There is no dump/restore or “sync local over production” command in this repo.
