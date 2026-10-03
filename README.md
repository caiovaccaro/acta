# Acta

Data-driven consensus verdicts on complex topics.

## Quick start

### Prerequisites

- Node.js 20+
- npm
- Docker and Docker Compose

### Setup

1. Clone and install:

   ```bash
   npm install
   ```

2. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Copy `.env.example` to `.env` in the project root and fill in values. Local Docker defaults:

   ```env
   DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
   NODE_ENV=development
   ADMIN_EMAIL="admin@example.com"
   ADMIN_PASSWORD="change-me"
   ADMIN_SESSION_SECRET="change-this-to-a-long-random-string"
   ```

4. Generate the Prisma client and run migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. Start the Next.js app (public site, `/api/*`, admin at `/admin`):

   ```bash
   npm run web:dev
   ```

6. Optional crawler:

   ```bash
   npm run crawler:start
   ```

7. Optional topic/question discovery (approve in admin before analysis):

   ```bash
   npm run db:discover:topics
   npm run db:discover:questions
   ```

## Layout

- `apps/web` — Next.js public site, API routes, and admin UI
- `apps/api` — API services imported by `apps/web` (not a separate local server)
- `apps/crawler` — RSS crawl and article extraction
- `modules/` — `db`, `core`, `config`, `shared`

## Commands

- `npm run web:dev` — site + API + admin
- `npm run crawler:start` — crawler
- `npm run db:generate` / `npm run db:migrate` / `npm run db:studio`
- `npm test` — workspace tests

## Docs

- `documentation/prd.md` — historical product brief
- `documentation/architecture.md` — current layout
- `documentation/tech_specs/` — crawler and related specs

## License

GNU Affero General Public License v3.0 only. See `LICENSE`.
