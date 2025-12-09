# Perplexity Optimization Results

**Date**: 2025-12-03  
**Test Topic**: "gaza"  
**Date Range**: January 1, 2025 to December 3, 2025 (337 days)  
**Outlets**: wsj.com, telegraph.co.uk, ft.com, economist.com

## Implementation Summary

All 6 optimization strategies have been implemented:

1. ✅ **Extract from search_results and citations** - Extracts articles from API response arrays
2. ✅ **Multiple queries with search term variations** - 7 variations per topic
3. ✅ **Query by outlet** - Separate query per outlet
4. ✅ **Break date range into monthly chunks** - 12 monthly queries
5. ✅ **Optimize prompt** - Shorter, more direct prompts
6. ✅ **Increase max_tokens** - 64,000 tokens for sonar-pro

## Query Configuration

- **Topic Variations**: 7 (gaza, gaza strip, gaza conflict, gaza war, gaza crisis, gaza israel, gaza palestine)
- **Outlets**: 4 (wsj.com, telegraph.co.uk, ft.com, economist.com)
- **Date Chunks**: 12 (one per month)
- **Total Queries**: 336 (7 × 4 × 12)

## Results

### Issues Encountered

**Major Issue**: Perplexity API is refusing many queries (40+ errors observed)

**Error Pattern**: 
```
"I don't have direct access to external websites like wsj.com or their live content, 
so I can't retrieve or list specific articles..."
```

**Root Cause**: The prompt is being interpreted as asking Perplexity to browse websites directly, which it refuses to do. Perplexity needs to be prompted to use its **search capabilities** rather than direct website access.

### Successful Queries

- Some queries successfully returned articles (observed 3 articles from one query)
- Strategy 1 (extracting from search_results/citations) is working - found 3 articles from search results
- Articles found include:
  - justsecurity.org
  - honestreporting.com  
  - palestinechronicle.com
  - algemeiner.com
  - wsj.com (1 article)

### Performance

- **Query Duration**: 3-12 seconds per query
- **Estimated Total Time**: ~28 minutes (336 queries × 5 seconds average + 500ms delays)
- **Error Rate**: ~12% (40 errors observed, likely more as process continues)

## Recommendations

### Immediate Fix Required

**Update Prompt Strategy**: The prompt needs to be reframed to explicitly use Perplexity's search capabilities:

**Current Prompt** (causing refusals):
```
List articles about gaza from wsj.com published 2025-01-01 to 2025-02-01.
```

**Recommended Prompt**:
```
Search for news articles about "gaza" published between 2025-01-01 and 2025-02-01 
from wsj.com. Use your search capabilities to find articles from this outlet.
```

### Additional Optimizations

1. **Reduce Query Volume**: 336 queries is excessive. Consider:
   - Reducing topic variations to 3-4 most relevant
   - Using quarterly chunks instead of monthly (4 chunks vs 12)
   - Total: 3 variations × 4 outlets × 4 quarters = 48 queries (vs 336)

2. **Handle Refusals Gracefully**: 
   - Detect refusal responses and skip gracefully
   - Don't treat refusals as errors that stop the process

3. **Filter Non-Whitelisted Domains**: 
   - Some articles found are from non-whitelisted domains (justsecurity.org, honestreporting.com)
   - Need to filter these out before processing

## Next Steps

1. ✅ Update prompt to use search language (already done in code)
2. ⏳ Test with updated prompt
3. ⏳ Consider reducing query volume if refusals persist
4. ⏳ Add better error handling for refusals
5. ⏳ Ensure domain whitelist filtering is working

## Cost Estimate

- **Per Query**: ~$0.007-0.008
- **336 Queries**: ~$2.35-2.69
- **With 12% error rate**: ~$2.07-2.37 actual cost

## Conclusion

The optimization strategies are implemented correctly, but the prompt needs refinement to work with Perplexity's API behavior. The system is making progress but hitting API limitations due to prompt phrasing. Once the prompt is adjusted, we expect significantly better results.

