# Implementation Tasks: Perplexity Ingestion Phase 1

## Task Breakdown

### Phase 1: Foundation Setup

#### Task 1.1: Create Project Structure
**Priority**: P0  
**Estimated Time**: 30 minutes  
**Dependencies**: None

- [ ] Create `apps/crawler/src/clients/` directory
- [ ] Create `apps/crawler/src/ingestion/` directory
- [ ] Create `apps/crawler/src/ingestion/__tests__/` directory
- [ ] Create `apps/crawler/src/utils/__tests__/` directory (if not exists)

**Acceptance Criteria**:
- All directories created
- Directory structure matches architecture design

---

#### Task 1.2: Create Configuration Files
**Priority**: P0  
**Estimated Time**: 30 minutes  
**Dependencies**: Task 1.1

- [ ] Create `apps/crawler/src/config/sourceWhitelist.json`
  - Include all 12 outlets (8 existing + 4 new)
- [ ] Create `apps/crawler/src/config/sourceDenylist.json` (empty initially)
- [ ] Update `.env.example` with `PERPLEXITY_API_KEY` placeholder

**Acceptance Criteria**:
- Whitelist includes all required domains
- Denylist file exists (can be empty)
- Environment variable documented

---

### Phase 2: Perplexity Client

#### Task 2.1: Implement Perplexity Client Class
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 1.1

- [ ] Create `apps/crawler/src/clients/perplexityClient.js`
- [ ] Implement constructor with API key validation
- [ ] Add JSDoc type definitions
- [ ] Export `PerplexityClient` class

**Acceptance Criteria**:
- Class can be instantiated with API key
- Throws error if API key is missing
- Proper error messages

---

#### Task 2.2: Implement Prompt Construction
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 2.1

- [ ] Implement `_buildPrompt(topic, allowedDomains)` method
- [ ] Include topic description
- [ ] Include domain whitelist constraint
- [ ] Request URLs, titles, publication dates, full text
- [ ] Explicitly exclude stance/verdict requests

**Acceptance Criteria**:
- Prompt includes all required elements
- Domain whitelist is properly formatted
- No stance/verdict language in prompt

---

#### Task 2.3: Implement API Request Handling
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2.2

- [ ] Implement API request method
- [ ] Use Perplexity API endpoint
- [ ] Include proper headers (Authorization, Content-Type)
- [ ] Handle request/response format
- [ ] Add timeout handling

**Acceptance Criteria**:
- API requests are properly formatted
- Headers are correct
- Timeout is handled

---

#### Task 2.4: Implement Response Parsing
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2.3

- [ ] Implement `_parseResponse(response)` method
- [ ] Extract article URLs
- [ ] Extract titles
- [ ] Extract publication dates
- [ ] Extract full text content
- [ ] Extract source domains
- [ ] Handle malformed responses gracefully

**Acceptance Criteria**:
- All article fields are extracted correctly
- Malformed responses don't crash
- Returns empty array on parse failure

---

#### Task 2.5: Implement Error Handling and Retries
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 2.4

- [ ] Handle rate limit errors (429)
- [ ] Implement exponential backoff
- [ ] Handle invalid API key errors (401)
- [ ] Handle network errors
- [ ] Handle timeout errors
- [ ] Add retry logic (max 3 retries)
- [ ] Log errors appropriately

**Acceptance Criteria**:
- Rate limits handled with backoff
- Invalid API key fails fast with clear error
- Network errors retry appropriately
- All errors are logged

---

### Phase 3: Source Filtering

#### Task 3.1: Implement Source Filter Class
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 1.2

- [ ] Create `apps/crawler/src/utils/sourceFilter.js`
- [ ] Implement constructor with whitelist/denylist
- [ ] Add JSDoc type definitions
- [ ] Export `SourceFilter` class

**Acceptance Criteria**:
- Class can be instantiated
- Whitelist and denylist are stored

---

#### Task 3.2: Implement Configuration Loading
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 3.1

- [ ] Implement method to load whitelist from JSON
- [ ] Implement method to load denylist from JSON
- [ ] Handle missing files gracefully
- [ ] Validate configuration format

**Acceptance Criteria**:
- Config files are loaded correctly
- Missing files handled gracefully
- Invalid format handled

---

#### Task 3.3: Implement Domain Extraction
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 3.1

- [ ] Implement `extractDomain(url)` method
- [ ] Handle various URL formats
- [ ] Handle invalid URLs
- [ ] Return null for invalid URLs

**Acceptance Criteria**:
- Extracts domain from valid URLs
- Returns null for invalid URLs
- Handles edge cases (ports, paths, etc.)

---

#### Task 3.4: Implement Whitelist/Denylist Checking
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 3.3

- [ ] Implement `isWhitelisted(domain)` method
- [ ] Implement `isDenylisted(domain)` method
- [ ] Handle case-insensitive matching
- [ ] Handle subdomains (optional, can be strict)

**Acceptance Criteria**:
- Whitelist checking works correctly
- Denylist checking works correctly
- Case-insensitive matching works

---

#### Task 3.5: Implement Article Filtering
**Priority**: P0  
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 3.4

- [ ] Implement `filterArticlesByWhitelistedSources(articles)` method
- [ ] Extract domain from each article URL
- [ ] Check against whitelist
- [ ] Check against denylist
- [ ] Return filtered articles
- [ ] Log filtered articles (optional)

**Acceptance Criteria**:
- Only whitelisted articles pass
- Denylisted articles are filtered out
- Invalid URLs are filtered out
- Returns correct filtered array

---

### Phase 4: Ingestion Strategy Interface

#### Task 4.1: Create Ingestion Strategy Interface
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: None

- [ ] Create `apps/crawler/src/ingestion/IngestionStrategy.js`
- [ ] Define abstract class or interface pattern
- [ ] Define `fetchArticles(topic, options)` method signature
- [ ] Define `validate()` method signature
- [ ] Define `getName()` method signature
- [ ] Add JSDoc with type definitions

**Acceptance Criteria**:
- Interface is well-defined
- Type definitions are clear
- Can be extended by implementations

---

### Phase 5: Perplexity Ingestion Strategy

#### Task 5.1: Implement Perplexity Ingestion Strategy
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 4.1, Task 2.1, Task 3.1

- [ ] Create `apps/crawler/src/ingestion/PerplexityIngestionStrategy.js`
- [ ] Extend or implement `IngestionStrategy`
- [ ] Implement constructor with client and filter
- [ ] Implement `fetchArticles()` method
- [ ] Implement `validate()` method
- [ ] Implement `getName()` method

**Acceptance Criteria**:
- Implements interface correctly
- Uses Perplexity client
- Uses source filter
- Returns normalized articles

---

#### Task 5.2: Implement Article Normalization
**Priority**: P0  
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 5.1

- [ ] Normalize `PerplexityArticleResult` to `ArticleCandidate`
- [ ] Map fields correctly (url, title, textContent, etc.)
- [ ] Handle missing fields gracefully
- [ ] Add source metadata

**Acceptance Criteria**:
- Articles are normalized correctly
- Missing fields handled
- Source metadata included

---

### Phase 6: Ingestion Pipeline

#### Task 6.1: Create Ingestion Job Structure
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 5.1

- [ ] Create `apps/crawler/src/jobs/perplexityIngestion.js`
- [ ] Set up imports
- [ ] Create main function `runPerplexityIngestion()`
- [ ] Add basic logging

**Acceptance Criteria**:
- File structure is correct
- Main function exists
- Can be imported and called

---

#### Task 6.2: Implement Outlet Loading
**Priority**: P0  
**Estimated Time**: 1 hour  
**Dependencies**: Task 6.1

- [ ] Load active outlets from database
- [ ] Extract domains from outlets
- [ ] Build whitelist from outlets
- [ ] Handle missing outlets gracefully

**Acceptance Criteria**:
- Outlets are loaded correctly
- Domains are extracted
- Whitelist is built

---

#### Task 6.3: Implement Topic Processing
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 6.2, Task 5.1

- [ ] Define topics array (world, politics, etc.)
- [ ] Loop through topics
- [ ] Call ingestion strategy for each topic
- [ ] Collect articles from all topics
- [ ] Handle errors per topic (continue on failure)

**Acceptance Criteria**:
- All topics are processed
- Articles are collected
- Errors don't stop processing

---

#### Task 6.4: Implement Article Deduplication
**Priority**: P0  
**Estimated Time**: 1.5 hours  
**Dependencies**: Task 6.3

- [ ] Normalize URLs (remove query params, trailing slashes)
- [ ] Check existing articles in database
- [ ] Filter out duplicates
- [ ] Log duplicate count

**Acceptance Criteria**:
- Duplicates are detected
- Duplicates are filtered out
- Normalization works correctly

---

#### Task 6.5: Implement Database Persistence
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 6.4

- [ ] Map articles to `Article` model
- [ ] Match articles to outlets (by domain)
- [ ] Create articles in database
- [ ] Handle database errors
- [ ] Use transactions for batch inserts

**Acceptance Criteria**:
- Articles are persisted correctly
- Outlets are matched correctly
- Database errors are handled
- Batch inserts work

---

#### Task 6.6: Add Logging and Statistics
**Priority**: P1  
**Estimated Time**: 1 hour  
**Dependencies**: Task 6.5

- [ ] Log ingestion start/end
- [ ] Log per-topic statistics
- [ ] Log filtered articles count
- [ ] Log duplicates count
- [ ] Log persisted articles count
- [ ] Return statistics object

**Acceptance Criteria**:
- All key events are logged
- Statistics are accurate
- Statistics are returned

---

### Phase 7: Testing

#### Task 7.1: Unit Tests - Perplexity Client
**Priority**: P0  
**Estimated Time**: 3 hours  
**Dependencies**: Task 2.5

- [ ] Test prompt construction
- [ ] Test response parsing (valid responses)
- [ ] Test response parsing (malformed responses)
- [ ] Test error handling (rate limits)
- [ ] Test error handling (invalid API key)
- [ ] Test retry logic
- [ ] Use mocks for API calls

**Acceptance Criteria**:
- All client methods are tested
- Error scenarios are covered
- Mocks are used correctly

---

#### Task 7.2: Unit Tests - Source Filter
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 3.5

- [ ] Test domain extraction
- [ ] Test whitelist checking
- [ ] Test denylist checking
- [ ] Test article filtering
- [ ] Test edge cases (invalid URLs, etc.)

**Acceptance Criteria**:
- All filter methods are tested
- Edge cases are covered

---

#### Task 7.3: Unit Tests - Ingestion Strategy
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 5.2

- [ ] Test article normalization
- [ ] Test validation
- [ ] Test error handling
- [ ] Use mocks for client and filter

**Acceptance Criteria**:
- Strategy methods are tested
- Mocks are used correctly

---

#### Task 7.4: Integration Tests - Pipeline
**Priority**: P1  
**Estimated Time**: 3 hours  
**Dependencies**: Task 6.6

- [ ] Test end-to-end flow (mocked API)
- [ ] Test database persistence
- [ ] Test deduplication
- [ ] Test error handling
- [ ] Use test database

**Acceptance Criteria**:
- End-to-end flow works
- Database operations work
- Error handling works

---

### Phase 8: Documentation

#### Task 8.1: Create README
**Priority**: P0  
**Estimated Time**: 2 hours  
**Dependencies**: Task 6.6

- [ ] Document Phase 1 architecture
- [ ] Document how to run ingestion manually
- [ ] Document where Perplexity is used
- [ ] Document how it will evolve in Phase 2/3
- [ ] Document configuration
- [ ] Document environment variables

**Acceptance Criteria**:
- README is comprehensive
- Usage is clear
- Architecture is explained

---

## Summary

**Total Estimated Time**: ~35 hours

**Priority Breakdown**:
- P0 (Critical): ~30 hours
- P1 (Important): ~5 hours

**Phases**:
1. Foundation Setup: 1 hour
2. Perplexity Client: 7 hours
3. Source Filtering: 5.5 hours
4. Ingestion Strategy Interface: 1 hour
5. Perplexity Ingestion Strategy: 3.5 hours
6. Ingestion Pipeline: 8.5 hours
7. Testing: 10 hours
8. Documentation: 2 hours




