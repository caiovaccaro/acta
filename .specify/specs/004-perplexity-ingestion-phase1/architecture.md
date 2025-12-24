# Architecture Design: Perplexity Ingestion Phase 1

## Overview

This document describes the detailed architecture for Phase 1 of the Perplexity ingestion system, focusing on modularity, testability, and future extensibility.

## Directory Structure

```
apps/crawler/src/
├── clients/
│   └── perplexityClient.js          # Perplexity API client
├── ingestion/
│   ├── IngestionStrategy.js          # Abstract interface
│   ├── PerplexityIngestionStrategy.js # Phase 1 implementation
│   └── __tests__/
│       ├── perplexityIngestionStrategy.test.js
│       └── ingestionStrategy.test.js
├── utils/
│   ├── sourceFilter.js               # Whitelist/denylist filtering
│   └── __tests__/
│       └── sourceFilter.test.js
├── jobs/
│   └── perplexityIngestion.js        # Main ingestion job
├── config/
│   ├── sourceWhitelist.json          # Whitelisted domains
│   └── sourceDenylist.json           # Denied domains (optional)
└── __tests__/
    └── integration/
        └── perplexityIngestion.test.js
```

## Component Design

### 1. Perplexity Client

**File**: `apps/crawler/src/clients/perplexityClient.js`

**Responsibilities**:
- Manage Perplexity API authentication
- Construct prompts with domain constraints
- Make API requests with proper error handling
- Parse and normalize API responses
- Handle rate limiting and retries

**Interface**:
```javascript
export class PerplexityClient {
  constructor(apiKey: string);
  
  /**
   * Fetches articles for a given topic from whitelisted domains
   * @param {string} topic - Topic name (e.g., "world", "politics")
   * @param {string[]} allowedDomains - Array of allowed domain names
   * @returns {Promise<PerplexityArticleResult[]>} Array of article results
   */
  async fetchArticlesForTopic(
    topic: string,
    allowedDomains: string[]
  ): Promise<PerplexityArticleResult[]>;
  
  /**
   * Constructs the prompt for Perplexity API
   * @private
   */
  _buildPrompt(topic: string, allowedDomains: string[]): string;
  
  /**
   * Parses Perplexity API response into structured article data
   * @private
   */
  _parseResponse(response: any): PerplexityArticleResult[];
}
```

**Error Handling**:
- API key missing: Throw clear error
- Rate limit: Exponential backoff (max 3 retries)
- Invalid response: Log and return empty array
- Network errors: Retry with backoff

### 2. Source Filter

**File**: `apps/crawler/src/utils/sourceFilter.js`

**Responsibilities**:
- Load whitelist/denylist configuration
- Extract domains from URLs
- Filter articles by allowed domains
- Validate source compliance

**Interface**:
```javascript
export class SourceFilter {
  constructor(whitelist: string[], denylist: string[] = []);
  
  /**
   * Filters articles by whitelisted sources
   * @param {PerplexityArticleResult[]} articles - Articles to filter
   * @returns {PerplexityArticleResult[]} Filtered articles
   */
  filterArticlesByWhitelistedSources(
    articles: PerplexityArticleResult[]
  ): PerplexityArticleResult[];
  
  /**
   * Checks if a domain is whitelisted
   */
  isWhitelisted(domain: string): boolean;
  
  /**
   * Checks if a domain is denylisted
   */
  isDenylisted(domain: string): boolean;
  
  /**
   * Extracts domain from URL
   */
  extractDomain(url: string): string | null;
}
```

**Configuration Loading**:
```javascript
// Load from config files
import whitelistConfig from '../config/sourceWhitelist.json';
import denylistConfig from '../config/sourceDenylist.json';
```

### 3. Ingestion Strategy Interface

**File**: `apps/crawler/src/ingestion/IngestionStrategy.js`

**Abstract interface for different ingestion methods**:

```javascript
/**
 * Abstract interface for article ingestion strategies
 */
export class IngestionStrategy {
  /**
   * Fetches articles for a given topic
   * @param {string} topic - Topic name
   * @param {IngestionOptions} options - Ingestion options
   * @returns {Promise<ArticleCandidate[]>} Array of article candidates
   */
  async fetchArticles(topic: string, options: IngestionOptions): Promise<ArticleCandidate[]>;
  
  /**
   * Validates the strategy configuration
   * @returns {Promise<boolean>} True if valid
   */
  async validate(): Promise<boolean>;
  
  /**
   * Gets the strategy name
   * @returns {string} Strategy identifier
   */
  getName(): string;
}
```

### 4. Perplexity Ingestion Strategy

**File**: `apps/crawler/src/ingestion/PerplexityIngestionStrategy.js`

**Implements `IngestionStrategy` interface**:

```javascript
export class PerplexityIngestionStrategy extends IngestionStrategy {
  constructor(perplexityClient: PerplexityClient, sourceFilter: SourceFilter);
  
  async fetchArticles(topic: string, options: IngestionOptions): Promise<ArticleCandidate[]>;
  async validate(): Promise<boolean>;
  getName(): string;
}
```

**Flow**:
1. Call Perplexity client with topic and whitelisted domains
2. Apply source filter to results
3. Normalize to `ArticleCandidate` format
4. Return candidates

### 5. Ingestion Pipeline

**File**: `apps/crawler/src/jobs/perplexityIngestion.js`

**Main orchestration job**:

```javascript
export async function runPerplexityIngestion(options: IngestionJobOptions): Promise<IngestionResult> {
  // 1. Load active outlets from database
  // 2. Extract whitelisted domains
  // 3. Initialize strategy
  // 4. For each topic:
  //    - Fetch articles via strategy
  //    - Normalize articles
  //    - Deduplicate
  //    - Persist to database
  // 5. Return statistics
}
```

**Topics**:
- world
- politics
- socioeconomic
- technology
- regulation
- humanitarian

## Data Models

### PerplexityArticleResult
```typescript
interface PerplexityArticleResult {
  url: string;
  title: string;
  textContent: string;
  publishedDate?: Date | null;
  sourceDomain: string;
  citations?: string[];
}
```

### ArticleCandidate
```typescript
interface ArticleCandidate {
  url: string;
  title: string;
  textContent: string;
  excerpt?: string | null;
  publishedDate?: Date | null;
  outletId: string;
  source: 'perplexity';
}
```

### IngestionOptions
```typescript
interface IngestionOptions {
  allowedDomains: string[];
  maxArticles?: number;
  dateRange?: {
    from: Date;
    to: Date;
  };
}
```

## Configuration Files

### sourceWhitelist.json
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
  ],
  "updatedAt": "2025-01-27"
}
```

### sourceDenylist.json
```json
{
  "domains": [],
  "updatedAt": "2025-01-27"
}
```

## Error Handling Strategy

### Perplexity API Errors
```javascript
try {
  const articles = await perplexityClient.fetchArticlesForTopic(topic, domains);
} catch (error) {
  if (error.code === 'RATE_LIMIT') {
    // Exponential backoff
    await sleep(Math.pow(2, retryCount) * 1000);
    retry();
  } else if (error.code === 'INVALID_API_KEY') {
    // Fail fast
    throw new Error('Invalid Perplexity API key');
  } else {
    // Log and continue
    log.error('Perplexity API error', error);
    return [];
  }
}
```

### Source Filtering Errors
```javascript
try {
  const domain = sourceFilter.extractDomain(url);
  if (!domain) {
    log.warning('Invalid URL, skipping', url);
    return null;
  }
  if (sourceFilter.isDenylisted(domain)) {
    return null; // Silently skip
  }
  if (!sourceFilter.isWhitelisted(domain)) {
    return null; // Silently skip
  }
} catch (error) {
  log.error('Source filtering error', error);
  return null;
}
```

## Testing Architecture

### Unit Tests
- **Perplexity Client**: Mock HTTP requests, test prompt construction, response parsing
- **Source Filter**: Test whitelist/denylist logic, domain extraction
- **Ingestion Strategy**: Mock client and filter, test normalization

### Integration Tests
- **End-to-end**: Mock Perplexity API, test full pipeline
- **Database**: Test article persistence and deduplication
- **Error scenarios**: Test error handling paths

### Test Fixtures
```javascript
// fixtures/perplexityResponse.json
{
  "articles": [
    {
      "url": "https://example.com/article",
      "title": "Article Title",
      "textContent": "Full article text...",
      "publishedDate": "2025-01-27T00:00:00Z",
      "sourceDomain": "example.com"
    }
  ]
}
```

## Performance Considerations

### Rate Limiting
- Perplexity API rate limits: Respect and handle gracefully
- Implement exponential backoff
- Batch requests where possible

### Caching
- Cache whitelist/denylist config (in-memory)
- Cache outlet lookups (by domain)

### Parallelization
- Process topics in parallel (if API allows)
- Batch database writes

## Security Considerations

### API Key Management
- Never commit API keys to version control
- Use environment variables only
- Validate API key on startup

### Input Validation
- Validate URLs before processing
- Sanitize article content
- Validate domains against whitelist

## Monitoring & Logging

### Key Metrics
- Articles fetched per topic
- Articles filtered (whitelist/denylist)
- Articles persisted
- Duplicates skipped
- API errors
- Processing time

### Logging Levels
- **INFO**: Ingestion start/end, statistics
- **WARN**: Filtered articles, API warnings
- **ERROR**: API failures, database errors

## Future Extensibility

### Adding New Strategies
1. Implement `IngestionStrategy` interface
2. Add strategy to factory/registry
3. Update ingestion pipeline to support multiple strategies

### Adding New Sources
1. Add domain to `sourceWhitelist.json`
2. Ensure outlet exists in database
3. Re-run ingestion

### Migration Path
- Phase 1: Perplexity only
- Phase 2: Add RSS strategy, support both
- Phase 3: Add API strategy, support all three


