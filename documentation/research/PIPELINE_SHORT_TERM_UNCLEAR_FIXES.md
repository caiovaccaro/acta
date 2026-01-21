Short-Term Fixes to Reduce "Unclear" Verdicts
=============================================

Scope
-----
This document focuses on low-cost actions that use existing content and cheap
LLM reprocessing to reduce the number of "Unclear" verdicts in the next run.

Immediate, Low-Cost Actions (No or Minimal LLM)
-----------------------------------------------
1) Converge near-duplicate questions within each topic.
   - Pool evidence that is currently split across similar questions.
   - Use the new script: `db:converge:similar-questions`.

2) Temporarily deactivate low-evidence questions.
   - Disable questions with 0-1 stances in the target month.
   - This reduces the count of "Unclear" verdicts without new LLM calls.

3) Recalculate verdicts after convergence.
   - Convergence already triggers recalculation for affected months, but ensure
     the monthly verdict set is refreshed if other changes are applied.

Cheap LLM Reprocessing (Targeted)
---------------------------------
1) Target questions just below the evidence threshold.
   - For questions with 2-3 stances, re-run stance classification on a small
     top-K set of candidate articles (title + excerpt retrieval).

2) LLM-only question dedupe to guide convergence.
   - Use a single LLM prompt per cluster candidate to confirm equivalence.
   - Keep LLM usage at the question-text level, not article level.

3) Re-run stance classification only for "likely relevant" pairs.
   - Use stricter retrieval (top-K) and only reclassify those pairs.

Operational Checklist
---------------------
- Run dry-run convergence to preview merges:
  - `npm run db:converge:similar-questions`
- Execute convergence:
  - `npm run db:converge:similar-questions -- --execute`
- Execute convergence with LLM confirmation:
  - `npm run db:converge:similar-questions -- --llm-confirm --llm-min-confidence=0.7 --execute`
- Recalculate verdicts if needed:
  - `npm run db:calculate:verdicts`
- Review changes in unclear rate and stance counts.

Notes
-----
- These steps minimize LLM spend by focusing on question-level operations and
  targeted reclassification only where it can flip a verdict.

