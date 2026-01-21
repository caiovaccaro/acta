# Pipeline Improvement Suggestions

## Analysis Date
Post-optimization analysis after lowering relevance threshold (0.3 → 0.2) and minimum articles for verdict (6 → 4)

## Current State Analysis

### Improvements Achieved
1. **Stored Classifications**: +23% increase (154 → 190)
2. **Clear Verdicts**: +43% increase (7 → 10 clear verdicts)
3. **Unclear Verdicts**: -8.3% reduction (83.7% → 76.7%)

### Remaining Issues
1. **Rejection Rate**: Still 92.2% (2,255 out of 2,445 classifications rejected)
2. **Unclear Verdicts**: 76.7% of verdicts still unclear (33 out of 43)
3. **Article Utilization**: Only 22% of matched articles result in stored classifications (93 out of 421)

## Root Cause Hypothesis

The threshold optimization had minimal impact (only ~5 fewer rejections), suggesting the problem is **earlier in the pipeline**:

- **Question Matching**: Articles are being matched to questions (394 matches), but then rejected by LLM as irrelevant (384 articles rejected)
- **Question Specificity**: Questions may be too broad or vague, causing false matches
- **Two-Stage Problem**: Topic matching works, but question-level relevance filtering is too strict

## Recommendations for Future Improvement

### 1. Improve Question Matching Precision

**Problem**: Articles are matched to questions but then rejected by LLM as not relevant.

**Suggested Actions**:
- Review the question matching algorithm in `modules/core/src/analysis/questionMatcher.ts`
- Consider stricter pre-filtering before LLM classification
- Analyze which question-article pairs are being rejected and why
- Implement keyword-based pre-filtering to reduce false matches

**Files to Review**:
- `modules/core/src/analysis/questionMatcher.ts`
- `modules/core/src/analysis/stanceClassifier.ts` (the `classifyArticleStances` function)

### 2. Review Question Specificity

**Problem**: Questions may be too broad, causing them to match articles that aren't actually relevant.

**Suggested Actions**:
- Audit existing questions for specificity
- Review questions that have high rejection rates
- Consider splitting broad questions into more specific sub-questions
- Use BAR validation framework to identify questions that need reformulation

**Files to Review**:
- Admin interface: `/admin/questions` - review questions with low article counts
- BAR validation results for questions with high rejection rates

### 3. Implement Two-Stage Filtering

**Problem**: Current system matches articles to questions, then LLM rejects most as irrelevant.

**Suggested Approach**:
- **Stage 1**: Stricter keyword/topic matching (reduce false positives)
- **Stage 2**: LLM relevance check (current threshold may be fine)

**Implementation Ideas**:
- Add a confidence threshold to question matching (currently 0.3 default)
- Only send high-confidence matches to LLM
- Track match confidence and rejection rate correlation

**Files to Modify**:
- `modules/core/src/analysis/questionMatcher.ts` - increase default `minConfidence`
- `modules/core/src/analysis/stanceClassifier.ts` - add pre-filtering logic

### 4. Monitor Article-Level Metrics

**Problem**: Need better visibility into which articles are being rejected and why.

**Suggested Actions**:
- Track which articles get rejected across all questions
- Identify patterns in rejected articles (topics, outlets, date ranges)
- Create dashboard showing:
  - Articles with 0 successful classifications
  - Questions with highest rejection rates
  - Average classifications per article

**Tools to Create**:
- Enhanced `db:analyze:funnel` script with article-level breakdown
- Admin dashboard showing rejection patterns
- Query to find "orphaned" articles (matched but never classified)

### 5. Consider Alternative Approaches

**Option A: Stricter Pre-Filtering**
- Increase question matching `minConfidence` from 0.3 to 0.5
- Only classify articles with high-confidence matches
- Trade-off: May miss some valid matches, but reduce LLM costs

**Option B: Question Clustering**
- Group similar questions together
- Classify articles against question clusters first
- Then refine to specific questions
- Trade-off: More complex, but potentially more efficient

**Option C: Iterative Refinement**
- Start with broad topic matching
- Use LLM to identify relevant questions from matched topics
- Then classify stance on identified questions
- Trade-off: More LLM calls, but better precision

## Metrics to Track

### Key Performance Indicators
1. **Classification Success Rate**: % of attempts that result in stored stances (target: >15%)
2. **Article Utilization Rate**: % of matched articles with at least one stored classification (target: >40%)
3. **Clear Verdict Rate**: % of verdicts that are not "Unclear" (target: >40%)
4. **Rejection Rate**: % of classifications rejected as not relevant (target: <70%)

### Current Baseline (Post-Optimization)
- Classification Success Rate: 7.8% (190/2,445)
- Article Utilization Rate: 22% (93/421)
- Clear Verdict Rate: 23.3% (10/43)
- Rejection Rate: 92.2% (2,255/2,445)

## Implementation Priority

### High Priority
1. **Improve Question Matching Precision** - Likely biggest impact
2. **Review Question Specificity** - Quick wins possible

### Medium Priority
3. **Implement Two-Stage Filtering** - Requires more development
4. **Monitor Article-Level Metrics** - Better visibility for future improvements

### Low Priority
5. **Alternative Approaches** - Consider if other improvements don't yield results

## Notes

- The threshold optimization (0.3 → 0.2) had minimal impact, suggesting the problem is not the threshold itself
- The issue appears to be in the matching phase, not the classification phase
- Current system: 421 articles matched → 394 to questions → 93 with classifications → 190 stored stances
- Ideal system: Better matching → fewer false matches → higher success rate → more clear verdicts

## Related Files

- `modules/core/src/analysis/questionMatcher.ts` - Question matching logic
- `modules/core/src/analysis/stanceClassifier.ts` - Stance classification logic
- `modules/core/src/analysis/verdictCalculator.ts` - Verdict calculation
- `apps/crawler/src/scripts/classifyStances.js` - Classification script
- `modules/db/src/scripts/analyzePipelineFunnel.ts` - Analysis script



