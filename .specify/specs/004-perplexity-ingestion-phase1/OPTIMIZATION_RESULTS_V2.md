# Perplexity Optimization Results - Second Test

**Date**: 2025-12-03  
**Test Topic**: "gaza"  
**Date Range**: January 1, 2025 to December 3, 2025 (337 days)  
**Outlets**: wsj.com, telegraph.co.uk, ft.com, economist.com  
**Prompt Version**: Updated (search-focused language)

## Test Configuration

- **Topic Variations**: 7 (gaza, gaza strip, gaza conflict, gaza war, gaza crisis, gaza israel, gaza palestine)
- **Outlets**: 4 (wsj.com, telegraph.co.uk, ft.com, economist.com)
- **Date Chunks**: 12 (one per month)
- **Total Queries**: 336 (7 × 4 × 12)
- **Max Tokens**: 64,000 (increased from 32,000)

## Results Summary

### Query Success Rate

- **Successful Queries**: 17 (5.1%)
- **Failed Queries (Refusals)**: 41+ (12.2%+)
- **Total Processed**: ~58+ queries (still running at time of analysis)
- **Remaining**: ~278 queries

### Articles Found

- **Total Articles**: ~5-10 articles found across successful queries
- **Sources Found**: 
  - wsj.com (YouTube links)
  - fdd.org
  - counterextremism.com
  - lemonde.fr
  - honestreporting.com

### Issues Identified

1. **High Refusal Rate**: Perplexity continues to refuse queries even with updated prompt
   - Error pattern: "I don't have direct access to live internet..."
   - Root cause: Perplexity's sonar-pro model interprets domain-specific requests as asking it to browse websites directly

2. **Prompt Update Ineffective**: The search-focused prompt language did not improve results
   - Updated prompt: "Search for and return news articles..."
   - Still getting refusals at similar rate (~12%)

3. **Non-Whitelisted Domains**: Some articles found are from non-target outlets
   - Need better domain filtering
   - Articles from lemonde.fr, fdd.org, counterextremism.com (not in whitelist)

4. **YouTube Links**: Some "articles" are actually YouTube videos
   - Example: "https://www.youtube.com/watch?v=D7eC8NgsrQ0"
   - Need to filter out video URLs

## Analysis

### Why Perplexity is Refusing

Perplexity's API appears to have built-in safeguards that prevent it from:
1. Being asked to browse specific websites directly
2. Retrieving content from paywalled sources (WSJ, FT, Telegraph, Economist)
3. Performing real-time searches on specific domains

The model seems to interpret our requests as asking it to:
- Access wsj.com directly
- Browse their article database
- Retrieve content from behind paywalls

### Potential Solutions

1. **Remove Domain Specification**: Don't specify domains in the prompt, let Perplexity search naturally and filter results afterward
   - Prompt: "Search for news articles about gaza published between [dates]"
   - Filter results by domain after receiving them

2. **Use More General Queries**: Ask for articles about the topic, then filter by outlet
   - Less specific = less likely to trigger refusals

3. **Focus on Citations**: Perplexity often provides citations even when refusing - extract from those

4. **Reduce Query Volume**: The 336 queries may be overwhelming the API
   - Consider: 3 variations × 4 outlets × 4 quarters = 48 queries

5. **Try Different Model**: Test if other Perplexity models handle this differently

## Recommendations

### Immediate Actions

1. ✅ **Extract from search_results/citations** - Already implemented, working
2. ⏳ **Remove domain specification from prompt** - Try general search, filter after
3. ⏳ **Add YouTube/video URL filtering** - Filter out non-article URLs
4. ⏳ **Improve domain whitelist enforcement** - Ensure only target domains pass through

### Long-term Considerations

1. **Alternative Approach**: Use Perplexity for general topic discovery, then use other methods (RSS, scraping) for specific outlets
2. **Hybrid Strategy**: Perplexity for discovery + direct RSS/scraping for target outlets
3. **API Limitations**: Accept that Perplexity may not be suitable for domain-specific article retrieval from paywalled sources

## Cost Analysis

- **Per Query**: ~$0.007-0.008
- **336 Queries**: ~$2.35-2.69
- **With 5% success rate**: ~$0.12-0.13 effective cost per article found
- **Very expensive** for the number of articles retrieved

## Conclusion

The optimization strategies are working correctly from a technical standpoint, but Perplexity's API limitations are preventing effective article retrieval. The model consistently refuses domain-specific requests, especially for paywalled outlets.

**Key Finding**: Perplexity may not be suitable for direct, domain-specific article retrieval from premium news sources. A different approach is needed:

1. Use Perplexity for general topic discovery (no domain restrictions)
2. Filter results by domain afterward
3. Or use a hybrid approach combining Perplexity discovery with RSS/scraping

The 6 optimization strategies are implemented correctly, but the fundamental API limitation needs to be addressed through prompt strategy changes.

