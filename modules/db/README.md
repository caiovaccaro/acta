# @acta/db

Prisma schema, client, repositories, and operator scripts for PostgreSQL.

## Setup

From the repo root:

```bash
docker compose up -d
cp .env.example .env   # if you do not already have one
npm install
npm run db:generate
npm run db:migrate
```

Local Docker defaults (`docker-compose.yml`):

- Database: `acta_dev`
- User: `acta`
- Password: `acta_dev_password`
- Port: `5432`

`DATABASE_URL` must point at that instance (see `.env.example`).

## Schema

Canonical definition: `prisma/schema.prisma`.

Models include Outlet, CrawlRequest, Article, Topic, Question, TopicArticle, ArticleAnalysisAttempt, ArticleStance, Verdict, EvidenceBullet, TimelineEvent, and QuestionRedirect.

## Commands

From the repo root (or `cd modules/db` and drop the `cd` prefix):

- `npm run db:generate` — Prisma client
- `npm run db:migrate` — create and apply migrations (dev)
- `npm run db:migrate:deploy` — apply existing migrations
- `npm run db:studio` — Prisma Studio
- `npm run db:health` — connectivity and schema checks
- `npm test` — unit tests in this package

There are no dump/restore or production-overwrite scripts. Apply schema changes with Prisma migrations only.

## Usage

```typescript
import { prisma, connectDatabase, disconnectDatabase } from '@acta/db';

await connectDatabase();
const topics = await prisma.topic.findMany();
await disconnectDatabase();
```

More migration policy: `MIGRATION_RULES.md`.
