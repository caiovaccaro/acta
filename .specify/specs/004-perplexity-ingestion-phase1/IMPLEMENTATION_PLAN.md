# Implementation Plan: Perplexity Ingestion Phase 1

## Overview

This document outlines the step-by-step implementation plan for Phase 1 of the Perplexity ingestion system.

## Implementation Phases

### Phase 1.1: Foundation Setup
**Goal**: Set up project structure and configuration

1. Create directory structure
2. Create configuration files (whitelist/denylist)
3. Set up environment variable handling
4. Add dependencies (if needed)

### Phase 1.2: Perplexity Client
**Goal**: Implement Perplexity API client

1. Create `PerplexityClient` class
2. Implement API key management
3. Implement prompt construction
4. Implement API request handling
5. Implement response parsing
6. Add error handling and retries

### Phase 1.3: Source Filtering
**Goal**: Implement whitelist/denylist filtering

1. Create `SourceFilter` class
2. Implement configuration loading
3. Implement domain extraction
4. Implement whitelist checking
5. Implement denylist checking
6. Implement article filtering

### Phase 1.4: Ingestion Strategy Interface
**Goal**: Create abstraction for ingestion strategies

1. Create `IngestionStrategy` abstract class
2. Define interface methods
3. Add type definitions

### Phase 1.5: Perplexity Ingestion Strategy
**Goal**: Implement Perplexity-specific strategy

1. Create `PerplexityIngestionStrategy` class
2. Implement `IngestionStrategy` interface
3. Integrate Perplexity client
4. Integrate source filter
5. Implement article normalization

### Phase 1.6: Ingestion Pipeline
**Goal**: Create main ingestion job

1. Create `perplexityIngestion.js` job
2. Load active outlets from database
3. Extract whitelisted domains
4. Initialize strategy
5. Process topics
6. Normalize articles
7. Deduplicate articles
8. Persist to database
9. Add logging and statistics

### Phase 1.7: Testing
**Goal**: Add comprehensive tests

1. Unit tests for Perplexity client
2. Unit tests for source filter
3. Unit tests for ingestion strategy
4. Integration tests for pipeline
5. Test fixtures

### Phase 1.8: Documentation
**Goal**: Document the system

1. Create README
2. Document configuration
3. Document usage
4. Document architecture decisions

## Detailed Task Breakdown

### Task 1: Project Structure Setup
- [ ] Create `apps/crawler/src/clients/` directory
- [ ] Create `apps/crawler/src/ingestion/` directory
- [ ] Create `apps/crawler/src/config/sourceWhitelist.json`
- [ ] Create `apps/crawler/src/config/sourceDenylist.json`
- [ ] Update `.env.example` with `PERPLEXITY_API_KEY`

### Task 2: Perplexity Client Implementation
- [ ] Create `PerplexityClient` class
- [ ] Implement constructor with API key validation
- [ ] Implement `_buildPrompt()` method
- [ ] Implement `_parseResponse()` method
- [ ] Implement `fetchArticlesForTopic()` method
- [ ] Add error handling (rate limits, invalid key, network errors)
- [ ] Add retry logic with exponential backoff

### Task 3: Source Filter Implementation
- [ ] Create `SourceFilter` class
- [ ] Implement configuration loading from JSON files
- [ ] Implement `extractDomain()` method
- [ ] Implement `isWhitelisted()` method
- [ ] Implement `isDenylisted()` method
- [ ] Implement `filterArticlesByWhitelistedSources()` method

### Task 4: Ingestion Strategy Interface
- [ ] Create `IngestionStrategy` abstract class
- [ ] Define `fetchArticles()` method signature
- [ ] Define `validate()` method signature
- [ ] Define `getName()` method signature
- [ ] Add TypeScript/JSDoc types

### Task 5: Perplexity Ingestion Strategy
- [ ] Create `PerplexityIngestionStrategy` class
- [ ] Extend `IngestionStrategy`
- [ ] Implement constructor with client and filter
- [ ] Implement `fetchArticles()` method
- [ ] Implement `validate()` method
- [ ] Implement `getName()` method
- [ ] Add article normalization logic

### Task 6: Ingestion Pipeline
- [ ] Create `perplexityIngestion.js` job file
- [ ] Import database repositories
- [ ] Load active outlets from database
- [ ] Extract domains from outlets
- [ ] Initialize Perplexity client
- [ ] Initialize source filter
- [ ] Initialize ingestion strategy
- [ ] Define topics array
- [ ] Loop through topics and fetch articles
- [ ] Normalize articles to Article model
- [ ] Deduplicate by URL
- [ ] Persist to database
- [ ] Add logging
- [ ] Return statistics

### Task 7: Unit Tests
- [ ] Test Perplexity client prompt construction
- [ ] Test Perplexity client response parsing
- [ ] Test Perplexity client error handling
- [ ] Test source filter domain extraction
- [ ] Test source filter whitelist checking
- [ ] Test source filter denylist checking
- [ ] Test source filter article filtering
- [ ] Test ingestion strategy normalization

### Task 8: Integration Tests
- [ ] Test end-to-end ingestion flow (mocked API)
- [ ] Test database persistence
- [ ] Test deduplication
- [ ] Test error handling scenarios

### Task 9: Documentation
- [ ] Create README.md in spec directory
- [ ] Document configuration
- [ ] Document usage (how to run)
- [ ] Document architecture
- [ ] Document environment variables

## Dependencies

### New Dependencies
- None required (use native `fetch` or existing HTTP client)

### Existing Dependencies
- `@acta/db`: Database access
- `dotenv`: Environment variable management

## Configuration

### Environment Variables
```bash
PERPLEXITY_API_KEY=your_api_key_here
```

### Configuration Files
- `sourceWhitelist.json`: Whitelisted domains
- `sourceDenylist.json`: Denied domains (optional)

## Testing Strategy

### Unit Tests
- Mock Perplexity API responses
- Test individual components in isolation
- Use fixtures for consistent test data

### Integration Tests
- Mock Perplexity API at HTTP level
- Use test database
- Verify end-to-end flow

### Test Coverage Goals
- Perplexity client: 80%+
- Source filter: 90%+
- Ingestion strategy: 80%+
- Pipeline: 70%+

## Rollout Plan

1. **Development**: Implement all components
2. **Testing**: Run unit and integration tests
3. **Documentation**: Complete README and docs
4. **Review**: Code review and architecture review
5. **Deployment**: Deploy to staging
6. **Validation**: Run ingestion job manually
7. **Monitoring**: Monitor for errors and performance
8. **Production**: Deploy to production

## Risk Mitigation

### Risks
1. **Perplexity API changes**: Monitor API documentation, version API calls
2. **Rate limiting**: Implement proper backoff, monitor usage
3. **Invalid responses**: Robust parsing, error handling
4. **Database issues**: Transaction handling, error recovery

### Mitigation Strategies
- Version API calls
- Comprehensive error handling
- Logging and monitoring
- Graceful degradation

## Success Criteria

- ✅ All components implemented
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Can ingest articles from Perplexity
- ✅ Source filtering works correctly
- ✅ Deduplication prevents duplicates
- ✅ Error handling is robust
- ✅ Existing RSS code remains untouched


