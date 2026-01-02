# Perplexity API Optimization Proposal

**Date**: 2025-12-03  
**Status**: Implemented  
**Model**: sonar-pro (best performing model after testing)

## Problem Statement

Perplexity API with `sonar-pro` model is only returning 1-13 articles for topics with extensive coverage (e.g., "gaza" over a full year), when hundreds of articles should be available from the target outlets (WSJ, The Telegraph, Financial Times, The Economist).

## Current Limitations

1. **Single query per topic** - Perplexity may be limiting results in a single response
2. **Not extracting from search_results/citations** - API response includes arrays that may contain more article URLs
3. **Large date range** - Querying entire year at once may be too broad
4. **All outlets in one query** - May dilute results across outlets
5. **Prompt may be suboptimal** - Current prompt might not be optimized for sonar-pro
6. **Token limit** - 32,000 tokens may limit number of articles returned

## Proposed Strategies

### Strategy 1: Extract from search_results and citations arrays

**Description**: The Perplexity API response includes `search_results` and `citations` arrays that contain article URLs and metadata. These may contain more articles than what's parsed from the message content.

**Implementation**: Extract articles from these arrays and merge with parsed content.

**Expected Impact**: 2-3x improvement (2-6 articles → 4-18 articles)

### Strategy 2: Multiple queries with search term variations

**Description**: Instead of one query for "gaza", make multiple queries with variations:
- "gaza"
- "gaza strip"
- "gaza conflict"
- "gaza war"
- "gaza crisis"
- "gaza israel"
- "gaza palestine"

**Implementation**: Add method to run multiple queries with term variations, deduplicate by URL.

**Expected Impact**: 5-10x improvement (combines with other strategies)

### Strategy 3: Query by outlet (one query per outlet)

**Description**: Query each outlet separately to maximize coverage:
- Query 1: "gaza" from wsj.com
- Query 2: "gaza" from telegraph.co.uk
- Query 3: "gaza" from ft.com
- Query 4: "gaza" from economist.com

**Implementation**: Loop through allowedDomains, make one query per domain, combine results.

**Expected Impact**: 3-5x improvement (better focus per outlet)

### Strategy 4: Break date range into monthly chunks

**Description**: Instead of one query for the whole year, make 12 monthly queries:
- Jan 2025, Feb 2025, Mar 2025, etc.

**Implementation**: Split date range into monthly chunks, query each separately, combine and deduplicate.

**Expected Impact**: 5-10x improvement (more focused searches)

### Strategy 5: Optimize prompt for sonar-pro

**Description**: Current prompt may be too verbose. Use a more direct, concise format optimized for sonar-pro.

**Current Prompt**:
```
Find news articles about "gaza" published from 2025-01-01 to 2025-12-03 on these websites: wsj.com, telegraph.co.uk, ft.com, economist.com

Search for articles from these outlets. Include articles from the past year about "gaza". Return as many as you can find - aim for 50+ articles.
```

**Optimized Prompt**:
```
List articles about gaza from wsj.com, telegraph.co.uk, ft.com, economist.com published 2025-01-01 to 2025-12-03.

Return JSON array with: url, title, summary, publishedDate, sourceDomain, textContent

Include ALL articles found.
```

**Expected Impact**: 1.5-2x improvement (clearer instructions)

### Strategy 6: Increase max_tokens

**Description**: Currently using 32,000 tokens. Increase to allow more articles in response.

**Implementation**: Increase max_tokens to 64,000 or 128,000 for sonar-pro.

**Expected Impact**: 2-3x improvement (more articles per response)

## Implementation Phases

### Phase 1 (Quick Wins)
1. ✅ Extract from search_results and citations arrays
2. ✅ Optimize prompt (shorter, more direct)
3. ✅ Increase max_tokens

**Expected Result**: 2-5x improvement (5-25 articles)

### Phase 2 (Medium Effort)
4. ✅ Query by outlet (4 separate queries)
5. ✅ Search term variations (6-7 queries per outlet = 24-28 total)

**Expected Result**: 10-20x improvement (50-200 articles)

### Phase 3 (If Needed)
6. ✅ Monthly date chunks (12 months × 4 outlets = 48 queries)

**Expected Result**: 50-100x improvement (200-500+ articles)

## Trade-offs

- **More API calls** = Higher cost and longer runtime
- **More queries** = Better coverage but more complexity
- **Deduplication** = Critical to avoid duplicates across strategies

## Implementation Status

All 6 strategies have been implemented and are active.

## Usage

The optimization strategies are automatically applied when using the Perplexity ingestion. No configuration changes needed - the system will:

1. Extract articles from search_results and citations
2. Query each outlet separately
3. Use search term variations
4. Break date ranges into monthly chunks
5. Use optimized prompts
6. Use increased token limits

## Monitoring

Check logs for:
- Number of articles found per query
- Number of articles from search_results/citations
- Query count and duration
- Deduplication statistics




