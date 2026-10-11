# Acta Crawler

Automated RSS news crawler for the Acta platform. Fetches articles from RSS feeds, extracts content, and stores everything in PostgreSQL.

## Overview

The crawler operates in two phases:
1. **RSS Processing**: Fetches RSS feeds and creates crawl requests in PostgreSQL
2. **Article Processing**: Processes pending crawl requests in batches, extracts article content, and stores articles in PostgreSQL

## Architecture

- **PostgreSQL**: All data is stored in PostgreSQL (no file-based storage)
- **Crawlee**: Web scraping framework for fetching and parsing content
- **Repository Pattern**: Database operations abstracted through repositories
- **Service Layer**: Business logic separated from data access

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL with pgvector (via Docker Compose)
- npm

### Installation

```bash
# Install dependencies
npm install

# Ensure database is running
docker compose up -d

# Run database migrations
cd ../../modules/db
npm run db:migrate
```

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
NODE_ENV=development

# Required when --max-articles is not passed
MAX_ARTICLES_PER_RUN=25           # Finite non-negative article extraction cap
STUCK_REQUEST_THRESHOLD_MINUTES=60 # Reset stuck requests after this many minutes
```

## Usage

### Run Crawler

```bash
# From project root; the cap is mandatory
npm run crawler:start -- --max-articles=25

# Select canonical outlet names exactly
npm run crawler:start -- --max-articles=10 --outlets "BBC" "Reuters"

# Validate a zero-work slice without database or network writes
npm run crawler:start -- --max-articles=0 --outlets "BBC"

# Or from crawler directory
cd apps/crawler
npm start -- --max-articles=25
```

### Export Data

```bash
# Export articles to CSV/JSON
npm run crawler:export:articles

# Export RSS metadata (crawl requests) to CSV/JSON
npm run crawler:export:rss
```

### Migration from File Storage

If you have existing data in Crawlee file storage:

```bash
npm run crawler:migrate:storage
```

## Configuration

### RSS Feeds

Edit `apps/crawler/src/config/outlets.json` to add or modify RSS feeds.

### Bounded slices

Every production run requires a finite, non-negative cap from
`--max-articles` or `MAX_ARTICLES_PER_RUN`; there is no unlimited fallback.
`--outlets` accepts comma-separated or repeated canonical names and matches
case-insensitively but exactly. Invalid names fail before writes. The command
prints one JSON result with selected outlets plus discovered, claimed,
completed, failed, and remaining counts.

The production command uses static HTTP and Cheerio. It does not install or
launch Playwright/Chromium and does not support authenticated, paywalled, or
JavaScript-rendered extraction.

## Testing

```bash
# Run integration tests
npm test

# Watch mode
npm run test:watch
```

## Project Structure

```
apps/crawler/
├── src/
│   ├── jobs/              # Main job orchestration
│   │   ├── crawlerRun.js   # Bounded slice orchestration
│   │   ├── database.js     # DB setup/teardown
│   │   ├── crawler.js      # Crawler initialization
│   │   ├── phases.js       # Processing phases
│   │   └── monitoring.js   # Metrics and logging
│   ├── crawlers/           # Crawlee handlers
│   │   ├── articleCrawler.js
│   │   └── parsers.js
│   ├── services/           # Business logic
│   │   └── articleService.js
│   ├── repositories/      # Data access (in @acta/db)
│   ├── rss/                # RSS processing
│   ├── mappers/            # Data transformation
│   ├── config/             # Configuration
│   ├── scripts/            # Utility scripts
│   └── __tests__/          # Tests
└── storage/                # Crawlee storage (optional, for backward compatibility)
```

## Data Flow

1. **RSS Feed Processing**:
   - Crawler fetches RSS feeds
   - Extracts article URLs and metadata
   - Creates `CrawlRequest` records in PostgreSQL (status: `pending`)

2. **Article Processing**:
   - Fetches pending `CrawlRequest` records in batches
   - Marks them as `in_progress`
   - Fetches article HTML
   - Extracts text content using Mozilla Readability
   - Creates `Article` records in PostgreSQL
   - Updates `CrawlRequest` status to `done`

3. **Error Handling**:
   - Failed requests are marked as `failed`
   - Retry logic enforces `MAX_RETRY_ATTEMPTS` (default: 3)
   - Stuck `in_progress` requests are reset on startup

## Monitoring

The crawler logs metrics at the start and end of each run:
- Queue status (pending, in_progress, done, failed)
- Total articles in database
- Processing statistics

## Troubleshooting

### Database Connection Issues

Ensure PostgreSQL is running:
```bash
docker compose up -d
```

Check database health:
```bash
cd ../../modules/db
npm run db:health
```

### Stuck Requests

The crawler automatically resets requests stuck in `in_progress` status on startup. Adjust `STUCK_REQUEST_THRESHOLD_MINUTES` if needed.

### Export Scripts

Export scripts now read directly from PostgreSQL. No file storage is required.

## Migration Notes

### From File Storage to PostgreSQL

The crawler has been migrated from Crawlee file storage to PostgreSQL:

- ✅ All data now stored in PostgreSQL
- ✅ Export scripts read from PostgreSQL
- ✅ No file-based deduplication (handled by database)
- ✅ Optional `pushData` for backward compatibility (no-op if not used)

Old file storage is ignored but can be migrated using `npm run crawler:migrate:storage`.

