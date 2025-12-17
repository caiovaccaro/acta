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

4. **Set up database:**
   ```bash
   # Generate Prisma client
   pnpm --filter @acta/db db:generate
   
   # Run migrations
   pnpm --filter @acta/db db:migrate
   ```

5. **Run crawler:**
   ```bash
   npm run crawler:start
   ```

6. **Admin UI:**
   ```bash
   ADMIN_PORT=4303 npm run admin:start
   # Pages: /admin/topics, /admin/questions, /admin/verdicts, /admin/suggestions
   ```

7. **Reactive discovery (optional):**
   ```bash
   npm run db:discover:topics
   npm run db:discover:questions
   # Then approve in admin UI before analysis
   ```

## Project Structure

- `apps/` - Deployable applications (crawler, api, web)
- `modules/` - Shared modules (db, config, core, shared)
- `infra/` - Infrastructure configuration

## Available Commands

### Crawler
- `pnpm start` - Run crawler
- `pnpm export:rss` - Export RSS data
- `pnpm export:articles` - Export articles

### Database
- `pnpm --filter @acta/db db:generate` - Generate Prisma client
- `pnpm --filter @acta/db db:migrate` - Run migrations
- `pnpm --filter @acta/db db:studio` - Open Prisma Studio

## Documentation

See `documentation/` for:
- PRD (Product Requirements Document)
- Architecture overview
- Technical specifications
