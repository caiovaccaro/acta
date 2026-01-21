Pipeline Analysis and Recommendations
====================================

Scope
-----
This document captures the current pipeline bottlenecks and proposes medium/long
term improvements that go beyond threshold tuning. It is based on the December
2025 funnel analysis and a review of the matching + classification code paths.

Key Observations
----------------
- The question matching step is lexical and permissive, which over-matches
  questions to articles and forces the LLM to do expensive relevance filtering.
- The LLM is explicitly instructed to return "Unclear" with low confidence for
  non-relevant pairs, leading to a very high rejection rate.
- A large share of questions have fewer than 4 matched stances, producing
  "Unclear" verdicts due to insufficient evidence.
- Question discovery is not gated by evidence availability, so questions can
  be active even when there is no content to answer them.

Likely Root Causes
------------------
- Weak question-to-article retrieval signal (keyword overlap only).
- No evidence-based activation or deactivation of questions.
- Evidence split across near-duplicate questions.
- LLM relevance filter is functioning as the primary matcher, which is costly
  and yields many low-confidence "Unclear" results.

Medium-Term Recommendations (1-3 months)
----------------------------------------
- Replace lexical matching with two-stage retrieval:
  1) Fast candidate retrieval (embeddings or BM25 on title + excerpt)
  2) Lightweight re-ranker or LLM verification on top-K candidates
- Add evidence-based activation rules:
  - Do not activate questions that do not have at least N candidate articles
    within the last month window.
- Introduce a question viability score:
  - Track "relevant attempts / total attempts" and auto-deactivate questions
    with persistent irrelevance.
- Add a top-K cap per article (e.g., 3-5 questions) to reduce noise.
- Implement automatic near-duplicate question convergence per topic.

Long-Term Recommendations (3-6+ months)
---------------------------------------
- Train a small supervised matcher using existing attempts:
  - Label pairs as relevant vs not relevant from historical attempts.
  - Use it as the main matcher before LLM stance classification.
- Add topic-aware indexing:
  - Build per-topic indexes for questions and articles to reduce search space.
- Add embedding-based question clustering and consolidation workflows:
  - Keep a "canonical question" and redirect variants to it.
- Evaluate question formulation quality and evidence availability as a joint
  criterion before activation (LLM + retrieval signals).
- Add active learning: review "hard negatives" from the LLM to improve matcher.

Risks and Considerations
------------------------
- Over-merging questions can collapse real nuance; add human review or higher
  thresholds for automated convergence.
- Lowering thresholds may increase noise; prefer better matching instead.
- Any automated deactivation should log and retain audit trails for review.


