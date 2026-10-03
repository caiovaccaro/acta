# Architecture

Acta is a TypeScript npm-workspace monorepo. News is ingested by a Crawlee crawler, stored in PostgreSQL (Prisma), and shown through a Next.js app.

## Stack

- Node.js 20+, TypeScript
- Next.js 14 (public UI, `/api/*`, `/admin`)
- Crawlee crawler
- PostgreSQL 16 + pgvector (Docker Compose locally)
- Prisma
- Hosting: Vercel for the web app

## Layout

```text
acta/
  apps/
    web/       # Next.js (site, API routes, admin)
    api/       # service layer used by apps/web
    crawler/   # RSS + article extraction
  modules/
    db/        # Prisma schema, repositories, operator scripts (no dump/restore)
    core/      # analysis, verdicts, LLM
    config/
    shared/
  documentation/
  docker-compose.yml
  package.json
```

## Runtime

- Crawler writes outlets, crawl requests, and articles to Postgres.
- `apps/web` reads the database through `@acta/api` services and `@acta/db`.
- Admin lives at `/admin` in `apps/web`, not a separate app.
- Local Postgres: `docker compose up -d` (user `acta`, database `acta_dev`).

## Docs that are historical

`documentation/prd.md` and `.specify/` describe earlier planning. Prefer this file and the root README for how the repo works today.
