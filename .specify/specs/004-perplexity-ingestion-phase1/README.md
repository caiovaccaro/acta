# Perplexity Ingestion Phase 1 - Documentation

## Overview

Phase 1 of Acta's new ingestion layer replaces RSS feeds and custom scrapers with the **Perplexity API**. Perplexity serves as a **discovery and content access layer only**, while Acta handles all analysis, stance classification, and verdict calculation.

### Key Principles

- **Perplexity's Role**: Discovery, content access, legal access to paid/free outlets, abstraction over complex scraping
- **Acta's Role**: Summarization, claim extraction, stance classification, consensus calculation, verdict UX
- **What Perplexity Does NOT Do**: Stance analysis, verdict determination, "who is right" analysis

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingestion Layer                          │
├─────────────────────────────────────────────────────────────┤
│  PerplexityIngestionStrategy (Phase 1)                      │
│  - Uses Perplexity API for article discovery                 │
│  - Filters by source whitelist                              │
│  - Normalizes articles to Article model                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Perplexity Client                         │
│  - API key management                                        │
│  - Prompt construction                                       │
│  - Response parsing                                         │
│  - Error handling & retries                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Source Filtering                          │
│  - Whitelist management                                     │
│  - Denylist management                                      │
│  - Domain extraction and validation                         │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
apps/crawler/src/
├── clients/
│   └── perplexityClient.js          # Perplexity API client
├── ingestion/
│   ├── IngestionStrategy.js          # Abstract interface
│   └── PerplexityIngestionStrategy.js # Phase 1 implementation
├── utils/
│   └── sourceFilter.js               # Whitelist/denylist filtering
├── jobs/
│   └── perplexityIngestion.js        # Main ingestion job
└── config/
    ├── sourceWhitelist.json          # Whitelisted domains
    └── sourceDenylist.json           # Denied domains
```

## Configuration

### Environment Variables

Create a `.env` file in the `apps/crawler/` directory:

```bash
# Required: Perplexity API key
# Get your API key from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=your_api_key_here

# Optional: Perplexity model name
# Check https://docs.perplexity.ai/getting-started/models for available models
# Default: llama-3.1-sonar-large-128k-online
PERPLEXITY_MODEL=llama-3.1-sonar-large-128k-online

# Required: Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/acta
```

**Important**: The `.env` file must be located at `apps/crawler/.env` (relative to the project root). The ingestion job will automatically load environment variables from this file.

If the `.env` file is missing, you'll see a warning, but the job will still check for environment variables set via other means (system environment, etc.).

### Source Whitelist

The whitelist is configured in `apps/crawler/src/config/sourceWhitelist.json`:

```json
{
  "domains": [
    "theguardian.com",
    "aljazeera.com",
    "bbc.com",
    "politico.com",
    "foxnews.com",
    "nationalreview.com",
    "dw.com",
    "thedispatch.com",
    "wsj.com",
    "telegraph.co.uk",
    "ft.com",
    "economist.com"
  ]
}
```

### Source Denylist

The denylist is configured in `apps/crawler/src/config/sourceDenylist.json` (empty by default):

```json
{
  "domains": []
}
```

## Usage

### Running the Ingestion Job

To run the Perplexity ingestion manually:

```bash
cd apps/crawler
npm run ingest:perplexity
```

Or directly with tsx:

```bash
tsx src/jobs/perplexityIngestion.js
```

### Programmatic Usage

```javascript
import { runPerplexityIngestion } from './jobs/perplexityIngestion.js';

// Run with default topics
const result = await runPerplexityIngestion();

// Run with custom options
const result = await runPerplexityIngestion({
  topics: ['world', 'politics'],
  maxArticlesPerTopic: 10,
});

console.log(result);
// {
//   success: true,
//   duration: "45.23s",
//   topics: { world: { fetched: 15, errors: 0 }, ... },
//   totalFetched: 90,
//   duplicates: 5,
//   unique: 85,
//   persisted: { created: 80, updated: 5, errors: 0 }
// }
```

## How It Works

### 1. Initialization

1. Loads active outlets from database
2. Extracts whitelisted domains from outlets
3. Initializes Perplexity client with API key
4. Loads source filter from config files
5. Creates Perplexity ingestion strategy

### 2. Topic Processing

For each topic (world, politics, socioeconomic, technology, regulation, humanitarian):

1. Calls Perplexity API with topic and domain whitelist
2. Perplexity returns articles with URLs, titles, dates, and content
3. Filters articles by source whitelist/denylist
4. Matches articles to outlets by domain
5. Normalizes articles to `ArticleCandidate` format

### 3. Deduplication

1. Checks existing articles in database by URL
2. Filters duplicates within the current batch
3. Returns unique articles only

### 4. Persistence

1. Creates new articles in database
2. Updates existing articles if found
3. Links articles to outlets
4. Returns statistics

## Data Flow

```
1. Ingestion Job Starts
   │
   ├─► Load outlets from database
   ├─► Extract whitelisted domains
   ├─► Initialize Perplexity client
   │
2. For each topic:
   │
   ├─► Call Perplexity API
   │   ├─► Construct prompt with domain whitelist
   │   ├─► Request articles (URLs, titles, dates, content)
   │   └─► Parse response
   │
   ├─► Filter by source whitelist/denylist
   │
   ├─► Match articles to outlets
   │
3. Deduplicate articles
   │
4. Persist to database
   │
   └─► Return statistics
```

## Error Handling

### Perplexity API Errors

- **Rate Limiting (429)**: Exponential backoff retry (max 3 attempts)
- **Invalid API Key (401)**: Fail fast with clear error message
- **Network Errors**: Retry with exponential backoff
- **Malformed Responses**: Log warning, return empty array, continue processing

### Source Filtering Errors

- **Invalid Domain**: Log warning, skip article
- **Whitelist Mismatch**: Skip article silently (expected behavior)
- **Denylist Match**: Skip article silently (expected behavior)

### Database Errors

- **Duplicate URL**: Skip (expected, handled by deduplication)
- **Missing Outlet**: Log error, skip article
- **Connection Failure**: Retry with exponential backoff

## Monitoring

### Key Metrics

The ingestion job returns statistics:

- **Duration**: Total processing time
- **Topics**: Per-topic statistics (fetched, errors)
- **Total Fetched**: Total articles fetched from Perplexity
- **Duplicates**: Number of duplicate articles found
- **Unique**: Number of unique articles
- **Persisted**: Created, updated, errors

### Logging

The job logs:
- ✅ Success messages (green checkmarks)
- ❌ Error messages (red X)
- 📋 Information messages (blue icons)
- ⚠️ Warning messages (yellow icons)

## Testing

### Unit Tests

```bash
npm test
```

Tests cover:
- Perplexity client prompt construction
- Perplexity client response parsing
- Source filter domain extraction
- Source filter whitelist/denylist checking
- Article normalization

### Integration Tests

```bash
npm test -- --testPathPattern=integration
```

Tests cover:
- End-to-end ingestion flow (with mocked Perplexity API)
- Database persistence
- Deduplication logic

## Future Phases

### Phase 2: RSS Integration

- Implement `RSSIngestionStrategy`
- Add RSS as alternative ingestion source
- Unified ingestion pipeline supporting multiple strategies

### Phase 3: Enterprise API Integration

- Implement `APIIngestionStrategy`
- Support licensed news APIs
- Multi-source aggregation

## Troubleshooting

### "PERPLEXITY_API_KEY environment variable is required"

**Solution**: Set `PERPLEXITY_API_KEY` in your `.env` file.

### "No outlets found in database"

**Solution**: Ensure outlets are configured in the database. You may need to run the RSS crawler first to create outlets, or manually create them.

### "No domains found in outlets"

**Solution**: Ensure outlets have valid names that can be mapped to domains. Check the `extractDomainFromOutletName()` function in `perplexityIngestion.js`.

### "Perplexity API rate limit exceeded"

**Solution**: The job will automatically retry with exponential backoff. If this persists, consider:
- Reducing `maxArticlesPerTopic`
- Processing fewer topics per run
- Adding delays between topic processing

### Articles not matching outlets

**Solution**: Check that:
1. Outlet names match the mapping in `extractDomainFromOutletName()`
2. Article domains match outlet domains
3. Whitelist includes all required domains

## Backward Compatibility

- ✅ Existing RSS/scraping code remains intact
- ✅ `Article` model unchanged
- ✅ `Outlet` model unchanged
- ✅ Can run both systems in parallel during transition
- ✅ Easy to switch back to RSS if needed

## Non-Goals for Phase 1

- ❌ RSS parsing (kept for Phase 2)
- ❌ HTML scraping (Crawlee, Playwright, etc.)
- ❌ Stance/ideology detection (Acta's layer, separate)
- ❌ Front-end code
- ❌ Complex scheduling (simple job runner is enough)
- ❌ Removal of existing RSS/scraping code

## Support

For issues or questions:
1. Check this README
2. Review the architecture documentation (`architecture.md`)
3. Check the implementation plan (`IMPLEMENTATION_PLAN.md`)
4. Review the spec (`spec.md`)

