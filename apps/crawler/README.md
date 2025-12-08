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
- pnpm

### Installation

```bash
# Install dependencies
pnpm install

# Ensure database is running
docker compose up -d

# Run database migrations
cd ../../modules/db
pnpm db:migrate
```

### Environment Variables

Create a `.env` file in the `apps/crawler/` directory:

```env
DATABASE_URL="postgresql://acta:acta_dev_password@localhost:5432/acta_dev?schema=public"
NODE_ENV=development

# Google News API (optional, for paid outlet discovery)
# Get your API key from: https://developers.google.com/custom-search/v1/overview
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_api_key_here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_search_engine_id_here

# Subscription credentials for paid outlets (optional)
# Used for Playwright-based content extraction
WSJ_EMAIL=your_wsj_email@example.com
WSJ_PASSWORD=your_wsj_password
FT_EMAIL=your_ft_email@example.com
FT_PASSWORD=your_ft_password
ECONOMIST_EMAIL=your_economist_email@example.com
ECONOMIST_PASSWORD=your_economist_password

# Playwright user data directory (optional, for persistent browser sessions)
# If set, browser will reuse cookies/sessions between runs
# This helps establish trust with Cloudflare and reduces challenges
# Example: PLAYWRIGHT_USER_DATA_DIR=/tmp/playwright-user-data
PLAYWRIGHT_USER_DATA_DIR=

# Optional: Batch processing configuration
BATCH_SIZE=100                    # Articles per batch (default: 100)
MAX_ARTICLES_PER_RUN=null         # Max articles per run (null = all, for periodic jobs)
STUCK_REQUEST_THRESHOLD_MINUTES=60 # Reset stuck requests after this many minutes
```

**Note**: The `.env` file should be located at `apps/crawler/.env`. 

For paid outlets (WSJ, FT, The Economist), the crawler uses:
- **Google News API** (optional) for article discovery via RSS or Custom Search
- **Playwright** with a real (non-headless) browser for content extraction
- Your subscription credentials for authenticated access

## Usage

### Run Crawler

```bash
# From project root
pnpm crawler:start

# Or from crawler directory
cd apps/crawler
pnpm start
```

### Google News + Playwright Ingestion

For paid outlets (WSJ, FT, The Economist):

```bash
# Run Google News + Playwright ingestion
pnpm crawler:ingest:googlenews

# Or from crawler directory
cd apps/crawler
pnpm ingest:googlenews
```

This will:
1. Discover articles using Google News (RSS or Custom Search API)
2. Extract content using Playwright with a real browser (non-headless)
3. Handle login flows automatically using your subscription credentials
4. Save articles to the database

**Note**: The browser window will be visible so you can monitor the process.

### Export Data

```bash
# Export articles to CSV/JSON
pnpm crawler:export:articles

# Export RSS metadata (crawl requests) to CSV/JSON
pnpm crawler:export:rss
```

### Migration from File Storage

If you have existing data in Crawlee file storage:

```bash
pnpm crawler:migrate:storage
```

## Configuration

### RSS Feeds

Edit `apps/crawler/src/config/outlets.json` to add or modify RSS feeds.

### Batch Processing

Control batch size and run limits via environment variables:
- `BATCH_SIZE`: Number of articles processed per batch (default: 100)
- `MAX_ARTICLES_PER_RUN`: Maximum articles to process in a single run (default: null = all)

For periodic execution (e.g., cron jobs), set `MAX_ARTICLES_PER_RUN` to limit work per run.

## Testing

```bash
# Run integration tests
pnpm test

# Watch mode
pnpm test:watch
```

## Project Structure

```
apps/crawler/
├── src/
│   ├── jobs/              # Main job orchestration
│   │   ├── refreshFeeds.js # Main entry point
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
pnpm db:health
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

Old file storage is ignored but can be migrated using `pnpm crawler:migrate:storage`.

