# Pipeline Optimization Summary

## Changes Implemented

### 1. Lowered Relevance Threshold (0.3 → 0.2)

**What changed:**
- Articles with "Unclear" stance and confidence < 0.2 (20%) are now considered "not relevant" and rejected
- Previously, the threshold was 0.3 (30%), which was too strict and rejected 92.4% of classifications

**Files modified:**
- `modules/core/src/analysis/stanceClassifier.ts` - Added `RELEVANCE_THRESHOLD = 0.2` constant
- `modules/core/src/llm/providers/openaiProvider.ts` - Updated prompt to reflect 0.2 threshold
- `apps/crawler/src/scripts/classifyStances.js` - Updated filtering logic
- `apps/crawler/src/scripts/runAnalysisPipeline.js` - Updated filtering logic
- `modules/db/src/scripts/analyzePipelineFunnel.ts` - Updated analysis script to use new threshold

**Impact:**
- More articles will pass the relevance check
- More classifications will be stored as `ArticleStance`
- Should reduce the rejection rate from 92.4% to a more reasonable level

### 2. Lowered Minimum Articles for Verdict (6 → 4)

**What changed:**
- Verdicts now require a minimum of 4 articles (down from 6)
- Questions with fewer than 4 articles will still get "Unclear" verdicts with low confidence

**Files modified:**
- `modules/core/src/analysis/verdictCalculator.ts` - Changed `MIN_ARTICLES_FOR_VERDICT = 4`
- `modules/db/src/scripts/analyzePipelineFunnel.ts` - Updated analysis to reflect new minimum

**Impact:**
- More questions will be able to get clear verdicts (not just "Unclear")
- Previously, 34 out of 43 verdicts (79%) had insufficient articles (< 6)
- With the new threshold, more questions should have enough articles for verdict calculation

### 3. Made Thresholds Configurable

**What changed:**
- Both thresholds are now defined as constants at the top of their respective files
- Easy to adjust in the future without hunting through code

**Constants:**
- `RELEVANCE_THRESHOLD = 0.2` in `stanceClassifier.ts`
- `MIN_ARTICLES_FOR_VERDICT = 4` in `verdictCalculator.ts`

## Expected Results

### Before Optimization:
- **92.4%** of classifications rejected as "not relevant"
- **83.7%** of verdicts were "Unclear"
- **34 out of 43** questions had insufficient articles (< 6)
- Only **6.3%** of classification attempts resulted in stored stances

### After Optimization:
- Lower rejection rate (more articles will pass relevance check)
- More questions will have sufficient articles for verdict calculation
- More clear verdicts (Yes/No/Probably) instead of "Unclear"
- Better utilization of the 2,445 classification attempts

## Next Steps

1. **Re-run stance classification** to see the impact:
   ```bash
   npm run crawler:classify-stances
   ```

2. **Re-calculate verdicts** with the new minimum:
   ```bash
   npm run db:calculate:verdicts
   ```

3. **Analyze the new funnel**:
   ```bash
   npm run db:analyze:funnel
   ```

4. **Monitor results** and adjust thresholds if needed:
   - If too many irrelevant articles get through, increase `RELEVANCE_THRESHOLD` slightly
   - If verdicts are still too unclear, consider lowering `MIN_ARTICLES_FOR_VERDICT` further (to 3) or improving question matching

## Notes

- The thresholds are now configurable constants, making future adjustments easy
- All changes maintain backward compatibility with existing data
- The analysis script (`db:analyze:funnel`) has been updated to reflect the new thresholds
- Historical data (existing `ArticleAnalysisAttempt` records) are not affected - only new classifications will use the new thresholds



