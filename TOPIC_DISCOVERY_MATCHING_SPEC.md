# Topic Discovery Matching Spec

## Summary
When discovering topics from articles, match discovered topics to existing topics whenever possible. Create new topics only when no reliable match exists.

## Goals
- Reduce duplicate topics created by discovery.
- Prefer matching to existing topics (including pending/moderated).
- Preserve the ability to create new topics when the match is weak.
- Make matching explainable (score + reason) for audit and tuning.

## Non-Goals
- Fully automatic topic convergence. That remains a manual admin workflow.
- Perfect semantic clustering; we prioritize predictable behavior.

## Current Behavior
- `discoverTopics` filters by confidence and deduplicates by exact normalized name.
- `discoverTopics.ts` always creates new topics from discovered results.

## Proposed Matching Strategy
Match each discovered topic against existing topics using a layered approach. The first layer that crosses threshold wins.

### Normalization
Create a `normalizeTopicName()` helper:
- lowercase
- trim
- collapse whitespace
- remove punctuation
- remove stopwords (`the`, `and`, `of`, `for`, etc.)

### Matching Layers (in order)
1. **Exact normalized name**
   - If `normalize(new) === normalize(existing)` -> match.
2. **Alias/synonym map**
   - Add a small configurable map (e.g., `mideast conflict -> israel gaza war`).
3. **Token overlap**
   - Jaccard similarity over normalized tokens.
   - Threshold: >= 0.7.
4. **Fuzzy string similarity**
   - Jaro-Winkler or Levenshtein similarity over normalized name.
   - Threshold: >= 0.88.
5. **LLM tie-breaker (optional)**
   - Only when top-2 scores are close (e.g., within 0.05) or none cross threshold but at least one is "near".
   - Prompt asks: "Does topic A refer to the same issue as topic B? Answer YES/NO + short reason."

### Match Output
Extend `DiscoveredTopic` with optional fields:
- `matchedTopicId?: string`
- `matchConfidence?: number` (0-1)
- `matchReason?: string` (e.g., `exact`, `alias`, `token_overlap`, `fuzzy`, `llm`)

## Proposed Flow
1. LLM discovers topics from articles (unchanged).
2. For each discovered topic:
   - Try to match to existing topics using the strategy above.
   - If matched, mark with `matchedTopicId`.
   - If not matched, keep as new candidate.
3. In `discoverTopics.ts`:
   - Only create topics where `matchedTopicId` is empty.
   - For matched topics, optionally update:
     - append `discoveredFromArticles` with new article IDs (dedupe).
     - add a log line to show matches.

## Config & Tuning
Add config defaults:
- `tokenOverlapThreshold = 0.7`
- `fuzzyThreshold = 0.88`
- `llmTieBreakMin = 0.8`
- `llmTieBreakDiff = 0.05`

Expose overrides via CLI flags or environment vars later if needed.

## Data Model Impact
No schema changes required. Optional additions:
- A `topic_aliases` JSON field (future).

## Acceptance Criteria
- Discovery does not create duplicates when an equivalent topic exists.
- Topic creation still occurs when no strong match is found.
- Logs clearly show when matches happen and why.
- Matching runs on existing topics across all moderation statuses.

## Testing Plan
- Unit tests for `normalizeTopicName`.
- Unit tests for token overlap and fuzzy match thresholds.
- Unit tests for `matchDiscoveredTopicToExisting`.
- Integration test: discoverTopics returns matchedTopicId for near-duplicate names.

## Rollout Plan
1. Implement matching helpers and wire into `discoverTopics`.
2. Update `discoverTopics.ts` to skip creation when matched.
3. Add tests for matching behavior.
4. Run discovery on a sample batch and review logs.

