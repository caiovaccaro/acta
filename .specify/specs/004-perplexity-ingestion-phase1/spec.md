# Feature Specification: Perplexity Ingestion Phase 1

**Feature Branch**: `004-perplexity-ingestion-phase1`  
**Created**: 2025-01-27  
**Status**: Draft  
**Phase**: Phase 1 - Perplexity as Full Replacement for RSS/Scraping

## Overview

This specification defines Phase 1 of Acta's new ingestion layer, which replaces RSS feeds and custom scrapers with the Perplexity API. In this phase, Perplexity serves as a **discovery and content access layer only**, while Acta handles all analysis, stance classification, and verdict calculation.

## Key Principles

### Perplexity's Role
- **Discovery**: Find articles from whitelisted news outlets
- **Content Access**: Retrieve article content (title, text, publication date)
- **Legal Access**: Provide legal access to both free and paid outlet content
- **Abstraction**: Simplify complex crawling/scraping logic

### Acta's Role (Not in this phase, but context)
- Summarization
- Claim extraction
- Stance classification
- Consensus calculation
- Verdict and debate UX

### What Perplexity Does NOT Do
- ❌ Stance analysis
- ❌ Verdict determination
- ❌ "Who is right" analysis
- ❌ Ideological classification

## Architecture

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Ingestion Layer                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐         ┌──────────────────────────┐  │
│  │ IngestionStrategy│◄────────┤ PerplexityIngestionStrategy│ │
│  │   (Interface)    │         │   (Phase 1 Implementation)│ │
│  └──────────────────┘         └──────────────────────────┘  │
│           ▲                              │                    │
│           │                              │                    │
│  ┌────────┴──────────┐                  │                    │
│  │ RSSIngestionStrategy│                 │                    │
│  │ (Phase 2 - Future) │                 │                    │
│  └────────────────────┘                  │                    │
│                                           │                    │
│  ┌────────────────────────────────────────┴──────────────┐    │
│  │              Ingestion Pipeline                       │    │
│  │  - Topic-based discovery                             │    │
│  │  - Source whitelist/denylist filtering               │    │
│  │  - Article normalization                             │    │
│  │  - Deduplication                                     │    │
│  │  - Database persistence                              │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Perplexity Client                         │
│  - API key management                                        │
│  - Prompt construction                                      │
│  - Response parsing                                         │
│  - Error handling                                           │
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

### Component Responsibilities

1. **Perplexity Client** (`apps/crawler/src/clients/perplexityClient.js`)
   - Handles all Perplexity API interactions
   - Manages API key from environment
   - Constructs prompts with domain whitelist
   - Parses and normalizes responses
   - Handles errors and retries

2. **Source Filtering** (`apps/crawler/src/utils/sourceFilter.js`)
   - Maintains whitelist/denylist configuration
   - Extracts domains from URLs
   - Filters articles by allowed domains
   - Validates source compliance

3. **Ingestion Strategy Interface** (`apps/crawler/src/ingestion/IngestionStrategy.js`)
   - Abstract interface for different ingestion methods
   - Methods: `fetchArticles(topic, options)`, `validate()`, etc.

4. **Perplexity Ingestion Strategy** (`apps/crawler/src/ingestion/PerplexityIngestionStrategy.js`)
   - Implements `IngestionStrategy` interface
   - Uses Perplexity client to fetch articles
   - Applies source filtering
   - Returns normalized article data

5. **Ingestion Pipeline** (`apps/crawler/src/jobs/perplexityIngestion.js`)
   - Orchestrates the ingestion process
   - Calls strategy with topics and whitelisted domains
   - Normalizes articles to `Article` model
   - Deduplicates by URL
   - Persists to database

## Data Flow

### Phase 1 Ingestion Flow

```
1. Ingestion Job Starts
   │
   ├─► Load active outlets from database
   ├─► Extract whitelisted domains from outlets
   ├─► Define topics (world, politics, socioeconomic, technology, regulation, humanitarian)
   │
2. For each topic:
   │
   ├─► Call PerplexityIngestionStrategy.fetchArticles(topic, whitelistedDomains)
   │   │
   │   ├─► PerplexityClient.fetchArticlesForTopic(topic, allowedDomains)
   │   │   │
   │   │   ├─► Construct prompt with:
   │   │   │   - Topic description
   │   │   │   - Domain whitelist constraint
   │   │   │   - Request for: URLs, titles, publication dates, full text
   │   │   │
   │   │   ├─► Call Perplexity API
   │   │   │
   │   │   └─► Parse response → PerplexityArticleResult[]
   │   │
   │   └─► SourceFilter.filterArticlesByWhitelistedSources(articles, whitelist, denylist)
   │       └─► Return filtered articles
   │
3. Normalize Articles
   │
   ├─► For each article:
   │   ├─► Extract: url, title, textContent, publishedDate
   │   ├─► Map to outlet (by domain matching)
   │   └─► Create Article entity
   │
4. Deduplication
   │
   ├─► Check existing articles by URL (normalized)
   ├─► Skip duplicates
   │
5. Persist to Database
   │
   └─► Save new articles to `Article` table
```

## Implementation Details

### Perplexity Client API

```typescript
interface PerplexityArticleResult {
  url: string;
  title: string;
  textContent: string;
  publishedDate?: Date | null;
  sourceDomain: string;
  citations?: string[];
}

class PerplexityClient {
  constructor(apiKey: string);
  
  async fetchArticlesForTopic(
    topic: string,
    allowedDomains: string[]
  ): Promise<PerplexityArticleResult[]>;
}
```

### Prompt Construction

The Perplexity prompt should:
1. Request articles from specific domains only
2. Ask for article URLs, titles, publication dates, and full text
3. NOT ask for stance, verdict, or analysis
4. Include clear constraints about domain whitelisting

Example prompt structure:
```
Find the latest news articles about [TOPIC] from these specific news outlets only:
- [DOMAIN_1]
- [DOMAIN_2]
- [DOMAIN_N]

For each article, provide:
- The article URL
- The article title
- The publication date (if available)
- The full article text content

Do NOT provide analysis, stance, or verdict. Only provide the raw article content and metadata.
```

### Source Whitelist Configuration

Whitelisted domains for Phase 1:
- Current outlets (8): The Guardian, Al Jazeera English, BBC, Politico, Fox News, National Review, Deutsche Welle, The Dispatch
- Additional outlets (4): Wall Street Journal, The Telegraph, Financial Times, The Economist

Configuration location: `apps/crawler/src/config/sourceWhitelist.json`

### Article Normalization

Articles from Perplexity are normalized to match the existing `Article` model:
- `url`: Normalized URL
- `title`: Article title
- `textContent`: Full article text
- `excerpt`: First paragraph or summary (optional)
- `publishedDate`: Parsed date or null
- `outletId`: Matched outlet from database
- `extractedAt`: Current timestamp

### Deduplication Strategy

1. Normalize URL (remove query params, trailing slashes, etc.)
2. Check `Article` table for existing URL
3. Skip if duplicate found
4. Create new `Article` record if unique

## Database Schema

No schema changes required. Uses existing `Article` and `Outlet` models.

## Error Handling

### Perplexity API Errors
- Rate limiting: Exponential backoff retry
- Invalid API key: Fail fast with clear error
- Malformed response: Log and skip, continue with other articles
- Partial failures: Process successful articles, log failures

### Source Filtering Errors
- Invalid domain: Log warning, skip article
- Whitelist mismatch: Skip article silently (expected behavior)

### Database Errors
- Duplicate URL: Skip (expected)
- Missing outlet: Log error, skip article
- Connection failure: Retry with exponential backoff

## Testing Strategy

### Unit Tests
- Perplexity client prompt construction
- Source filtering logic (whitelist/denylist)
- Article normalization
- URL deduplication logic

### Integration Tests
- End-to-end ingestion flow (with mocked Perplexity API)
- Database persistence
- Error handling scenarios

### Test Fixtures
- Mock Perplexity API responses
- Sample article data
- Whitelist/denylist configurations

## Configuration

### Environment Variables
- `PERPLEXITY_API_KEY`: Required, Perplexity API key

### Configuration Files
- `apps/crawler/src/config/sourceWhitelist.json`: Whitelisted domains
- `apps/crawler/src/config/sourceDenylist.json`: Denied domains (optional)

## Non-Goals for Phase 1

- ❌ RSS parsing (kept for Phase 2)
- ❌ HTML scraping (Crawlee, Playwright, etc.)
- ❌ Stance/ideology detection (Acta's layer, separate)
- ❌ Front-end code
- ❌ Complex scheduling (simple job runner is enough)
- ❌ Removal of existing RSS/scraping code

## Backward Compatibility

- Existing RSS/scraping code remains intact
- `Article` model unchanged
- `Outlet` model unchanged
- Can run both systems in parallel during transition
- Easy to switch back to RSS if needed

## Future Phases

### Phase 2: RSS Integration
- Implement `RSSIngestionStrategy`
- Add RSS as alternative ingestion source
- Unified ingestion pipeline supporting multiple strategies

### Phase 3: Enterprise API Integration
- Implement `APIIngestionStrategy`
- Support licensed news APIs
- Multi-source aggregation

## Acceptance Criteria

1. ✅ Perplexity client successfully fetches articles for topics
2. ✅ Source whitelist filtering works correctly
3. ✅ Articles are normalized and persisted to database
4. ✅ Deduplication prevents duplicate articles
5. ✅ Error handling gracefully handles API failures
6. ✅ Tests cover client, filtering, and deduplication
7. ✅ Documentation explains Phase 1 architecture and usage
8. ✅ Existing RSS/scraping code remains untouched

## Success Metrics

- Articles successfully ingested per run
- Source compliance rate (whitelist adherence)
- Deduplication rate (duplicates caught)
- API error rate
- Processing time per topic


