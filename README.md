# Acta Platform

Data-driven consensus verdicts on complex topics.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### Setup

1. **Clone and install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables:**
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
   NODE_ENV=development
   ```
   Admin auth requires these additional variables:
   ```env
   ADMIN_EMAIL="admin@acta.app"
   ADMIN_PASSWORD="change-me"
   ADMIN_SESSION_SECRET="change-this-to-a-long-random-string"
   ```

4. **Set up database:**
   ```bash
   # Generate Prisma client
   pnpm --filter @acta/db db:generate
   
   # Run migrations
   pnpm --filter @acta/db db:migrate
   ```

5. **Start the app (web + API + admin):**
   ```bash
   pnpm run web:dev
   ```
   This runs the Next.js app: public site, API routes under `/api/*`, and admin UI at `/admin` (e.g. `/admin/topics`, `/admin/questions`, `/admin/verdicts`).

6. **Crawler (optional, separate process):**
   ```bash
   pnpm run crawler:start
   ```

7. **Reactive discovery (optional):**
   ```bash
   npm run db:discover:topics
   npm run db:discover:questions
   # Then approve in admin UI before analysis
   ```

## Project Structure

- `apps/web` - Next.js app (public site, API routes, and admin UI)
- `apps/crawler` - Crawler service
- `apps/api` / `apps/admin` - Standalone packages (used by web; not run separately for local dev)
- `modules/` - Shared modules (db, config, core, shared)

## Available Commands

### App
- `pnpm run web:dev` - Run web app (site + API + admin)

### Crawler
- `pnpm run crawler:start` (or `pnpm start`) - Run crawler
- `pnpm run crawler:export:rss` - Export RSS data
- `pnpm run crawler:export:articles` - Export articles

### Database
- `pnpm --filter @acta/db db:generate` - Generate Prisma client
- `pnpm --filter @acta/db db:migrate` - Run migrations
- `pnpm --filter @acta/db db:studio` - Open Prisma Studio

## Documentation

See `documentation/` for:
- PRD (Product Requirements Document)
- Architecture overview
- Technical specifications
