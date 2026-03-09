# Pipeline Easy Guide

This guide explains:

1. What each pipeline stage does.
2. What changed in the recent optimization work.
3. How to safely roll back if needed.

---

## Big Picture

Think of the pipeline like a toy factory:

- We collect toy pieces (articles).
- We sort them into boxes (topics).
- We ask toy questions (questions).
- We check what each piece says about each question (stance classification).
- We decide the final answer (verdict).
- We write nice summaries (content generation).

---

## Stage-by-Stage: What Happens

## 1) Discover Topics

Command:

- `npm run db:discover:topics`

What it does:

- Reads many articles.
- Finds important themes.
- Saves/updates those themes as topics.

Like you are 5:

- "Read lots of stories and make labels for what they are about."

---

## 2) Match Articles to Topics

Command:

- `npm run crawler:match-topics`

What it does:

- Looks at each article.
- Decides which topic(s) it belongs to.

Like you are 5:

- "Put each story card into the right topic box."

---

## 3) (Optional but Recommended) Merge Similar Topics

Command:

- `npm run db:converge:similar-topics -- --llm-confirm --llm-min-confidence=0.7 --execute`

What it does:

- Finds topics that are almost the same.
- Merges duplicates after confirmation.

Like you are 5:

- "If two boxes have almost the same name, combine them into one box."

---

## 4) Discover Questions

Command:

- `npm run db:discover:questions`

What it does:

- For each topic, generates candidate questions people care about.

Like you are 5:

- "For each box, write good questions to ask."

---

## 5) (Optional but Recommended) Merge Similar Questions

Command:

- `npm run db:converge:similar-questions -- --llm-confirm --llm-min-confidence=0.7 --execute`

What it does:

- Finds duplicate or near-duplicate questions.
- Merges them.

Like you are 5:

- "If two questions are almost the same, keep just one."

---

## 6) Validate BAR Questions

Command:

- `npm run db:validate:bar-questions`

What it does:

- Checks if questions are clear and conversation-friendly.

Like you are 5:

- "Make sure questions are easy to understand."

---

## 7) Classify Stances (Most Expensive Step)

Command:

- `npm run crawler:classify-stances`

What it does:

- For each article and each relevant question:
  - Ask the LLM: Does this article say yes, no, or unclear?
  - Save the result and confidence.

Like you are 5:

- "For every story and question, ask: is this a yes, no, or maybe?"

---

## 8) Calculate Verdicts

Command:

- `npm run db:calculate:verdicts`

What it does:

- Combines many stances into one overall verdict per question.

Like you are 5:

- "Count all the little yes/no/maybe votes and pick the final answer."

---

## 9) Generate Summaries and Extra Content

Commands:

- `npm run db:summarize:verdicts`
- `npm run db:generate:context-blurbs`
- `npm run db:generate:timeline-events`
- `npm run db:generate:debate-content`

What it does:

- Writes human-friendly text for cards/pages.

Like you are 5:

- "Turn numbers and votes into easy stories people can read."

---

## What Was Modified (Exactly)

These changes were made to reduce cost and extra work.

## A) Better LLM model routing by task

File:

- `modules/core/src/llm/config.ts`

What changed:

- Added task-aware model selection:
  - `classification`, `validation`, `convergence`, `generation`.
- Added env controls:
  - `OPENAI_MODEL_CHEAP`
  - `OPENAI_MODEL_STRONG`
  - task-specific overrides like `OPENAI_MODEL_CLASSIFICATION`
- Safe fallback remains:
  - If nothing extra is set, it still uses `OPENAI_MODEL`.

Why:

- Use cheaper model for non-generative checks when desired.
- Keep strong model for generation when desired.

---

## B) Faster stance classification (remove repeated DB lookups)

File:

- `apps/crawler/src/scripts/classifyStances.js`

What changed:

- Preloads all questions by topic one time (`topicId -> questions[]`).
- Before: question lookup happened repeatedly per article/topic.
- Now: reused in-memory map (less DB chatter).

Why:

- Less repeated work, faster processing.

---

## C) Early filtering and practical caps before LLM calls

Files:

- `apps/crawler/src/scripts/classifyStances.js`
- `apps/crawler/src/scripts/runAnalysisPipeline.js`

What changed:

- Added optional question prefilter before LLM call.
- Added defaults:
  - `QUESTION_MATCH_MIN_CONFIDENCE` (default `0.5`)
  - `MAX_QUESTIONS_PER_TOPIC_DEFAULT` (default `20`)
  - `MAX_QUESTIONS_PER_ARTICLE_DEFAULT` (default `40`)
- Added CLI switches:
  - `--question-match-min-confidence=<value>`
  - `--max-questions-per-topic=<n>`
  - `--max-questions-per-article=<n>`
  - `--no-question-prefilter`
- Added logs:
  - candidate pairs before prefilter
  - after prefilter
  - after caps

Why:

- Fewer low-value article-question pairs reach the expensive LLM step.

---

## D) Raised shared default question matching threshold

File:

- `modules/core/src/analysis/stanceClassifier.ts`

What changed:

- Default question match confidence is now env-driven:
  - `QUESTION_MATCH_MIN_CONFIDENCE` (default `0.5`)

Why:

- More strict by default, fewer weak matches.

---

## E) Better observability and safer percentages

File:

- `modules/db/src/scripts/analyzePipelineFunnel.ts`

What changed:

- Added helper for safe percentage formatting (avoids divide-by-zero issues).
- Added projected cost output using:
  - `CLASSIFICATION_COST_PER_1K`
- Corrected threshold labels in logs to match real threshold (`0.2`).

Why:

- Easier to understand cost and rejection behavior each run.

---

## F) Non-generative scripts now request task-specific model types

Files:

- `modules/db/src/scripts/validateBarQuestions.ts` (`validation`)
- `modules/db/src/scripts/convergeSimilarQuestions.ts` (`convergence`)
- `modules/db/src/scripts/convergeSimilarTopics.ts` (`convergence`)

Why:

- Keeps model choice consistent with task type.

---

## Safe Rollback (Simple)

If you want old behavior quickly, use these:

1. Turn prefilter off at runtime:
   - `npm run crawler:classify-stances -- --no-question-prefilter`
   - `npm run crawler:analyze -- --no-question-prefilter`

2. Lower threshold back to old style:
   - set `QUESTION_MATCH_MIN_CONFIDENCE=0.3`

3. Remove practical caps:
   - `--max-questions-per-topic=0 --max-questions-per-article=0`
   - or set very high defaults in env.

4. Disable model split:
   - unset `OPENAI_MODEL_CHEAP`, `OPENAI_MODEL_STRONG`, and task-specific `OPENAI_MODEL_*`
   - keep only `OPENAI_MODEL`

5. Full code rollback (git):
   - revert only these changed files:
     - `modules/core/src/llm/config.ts`
     - `apps/crawler/src/scripts/classifyStances.js`
     - `apps/crawler/src/scripts/runAnalysisPipeline.js`
     - `modules/core/src/analysis/stanceClassifier.ts`
     - `modules/db/src/scripts/analyzePipelineFunnel.ts`
     - `modules/db/src/scripts/validateBarQuestions.ts`
     - `modules/db/src/scripts/convergeSimilarQuestions.ts`
     - `modules/db/src/scripts/convergeSimilarTopics.ts`

---

## One-Line Summary

We kept the same pipeline flow, but now we filter earlier, avoid repeated queries, optionally use cheaper models for non-generative work, and log better cost/funnel metrics.
