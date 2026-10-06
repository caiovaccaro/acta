# Acta Phase 1 Technical Plan: Autonomous Cloud Pipeline

Status: Proposed
Audience: Engineering, operations, and ticket authors
Primary objective: Keep Acta continuously updated in the cloud with minimal human intervention and a total operating ceiling of USD 50 per month.

## 1. Executive summary

Phase 1 will turn the existing script-driven pipeline into a resumable cloud process. It will reuse the current Next.js application, PostgreSQL schema, crawler, moderation fields, analysis services, and admin UI.

The recommended first deployment is:

- Vercel Hobby for the public website, API routes, and admin UI.
- Neon Free for PostgreSQL, with a paid Launch fallback only if the database exceeds the free storage or compute limits.
- Standard GitHub-hosted Actions runners for scheduled pipeline slices.
- OpenAI for classification and generation, protected by an application-level monthly budget gate.
- Tavily's free Researcher plan for budget-aware topic and article prioritization plus moderation corroboration.
- Resend's free transactional tier for run receipts, failures, and moderation digests.

The worker will not attempt to process an unbounded backlog in one invocation. A scheduled run will claim a lease, process a bounded slice for at most 4 hours and 45 minutes, persist checkpoints in PostgreSQL, send an email receipt, and exit. The next invocation resumes from the database.

This design supports both operating modes:

1. Backlog mode: run every six hours until the queue is near empty.
2. Steady-state mode: run once per day, with an additional six-hour retry schedule when work remains.

The database is the source of truth for queue state, stage state, idempotency, usage accounting, and recovery. GitHub Actions is replaceable compute, not the orchestrator of record.

## 2. Goals

Phase 1 must:

1. Keep the public site and API continuously available from the cloud.
2. Fetch and extract new articles automatically.
3. Use Tavily to identify current stories, rank which topics and articles consume capped processing budget, and corroborate automated discoveries.
4. Incrementally discover, match, classify, calculate, and publish.
5. Resume safely after timeout, cancellation, rate limit, runner loss, or partial failure.
6. Keep normal human involvement to reviewing an email digest and optionally using the existing admin UI.
7. Support a controlled path from manual approval to policy-based auto-approval.
8. Notify the owner after every scheduled slice and immediately after a failed slice.
9. Prevent expected monthly spend from exceeding USD 50.
10. Provide enough telemetry to answer: what ran, what changed, what remains, what failed, and what it cost.

## 3. Non-goals

The following are explicitly outside Phase 1:

- User accounts, reading lists, follows, voting, and article access limits.
- Newsletter distribution to end users.
- A public commercial API product.
- Chat over Acta data.
- Paid reports or paywalls.
- Kubernetes, Kafka, Redis, or a general-purpose workflow platform.
- Real-time crawling.
- Horizontal execution of the same pipeline stage.
- Automatic publication of safety-sensitive or low-confidence discoveries.
- Rebuilding the crawler or analysis pipeline from scratch.

## 4. Constraints and operating assumptions

### 4.1 Product constraints

- Acta is a hobby project. A delayed update is preferable to an unexpected bill.
- The website should remain useful when the pipeline is paused or behind.
- Moderation should be low-touch, not eliminated without evidence.
- The first version should favor explicit database state and boring infrastructure.

### 4.2 Runtime constraints

- A standard GitHub-hosted Actions job has a six-hour execution limit.
- Scheduled Actions can start late and must not be treated as an exact clock.
- A runner can disappear without executing cleanup.
- The existing pipeline can require hours or days to process a backlog.
- The existing analysis scripts are partly idempotent but do not provide a complete automatic stage checkpoint.

### 4.3 Cost constraints

- USD 50 is the maximum monthly operating cost, not a target.
- LLM calls are the main variable cost.
- Provider dashboard budgets must not be the only control because some provider budgets are alerts rather than strict request blockers.
- In-flight reservations mean the application should stop below USD 50.

## 5. Current system assessment

### 5.1 Existing capabilities to reuse

- `apps/web` already serves the public site, `/api/*`, `/admin`, and `/api/health`.
- `vercel.json` already describes a Vercel-oriented monorepo build.
- `apps/crawler/src/jobs/refreshFeeds.js` already fetches RSS, creates crawl requests, and extracts articles.
- `CrawlRequest` persists queue status, attempts, errors, and timestamps.
- Article URL, topic-article, article-question-month, and question-month uniqueness constraints provide useful idempotency.
- `runAnalysisPipeline.js`, `classifyStances.js`, and database scripts already implement the analysis stages.
- Topics already support `pending`, `approved`, and `rejected`.
- Questions already support `pending`, `validated`, `rejected`, and `needs_reformulation`.
- Public topic queries already exclude unapproved topics by default.
- Existing admin routes support batch approval and rejection.
- Existing model routing supports cheap, strong, and task-specific OpenAI models.
- The OpenAI provider already logs tokens and estimated cost per successful call.

### 5.2 Gaps that block autonomous operation

1. There is no scheduled workflow or cloud worker.
2. There is no durable pipeline-run or stage-checkpoint model.
3. Analysis offsets are supplied manually and are not resumed automatically.
4. The primary crawler does not reliably honor the documented `MAX_ARTICLES_PER_RUN`.
5. Outlet-filtered crawling references an undefined `pilotOutlets` variable.
6. Topic and question discovery scan broad datasets instead of a persisted incremental window.
7. LLM usage is logged but not centrally accounted or blocked by a budget guard.
8. Tavily is not integrated.
9. There is no operational or moderation email.
10. Vercel's configured output path may not match the custom Next.js `distDir`.
11. The existing Dockerfile is not a validated production worker image and is not required for the first GitHub Actions deployment.
12. The current Vercel deployment is failing and blocks all later cloud milestones. A local production build succeeds only when `NODE_ENV=production`; the inherited/local `NODE_ENV=development` build reproduces broad prerender `useContext` failures. Vercel build logs and configured environment variables must be checked before assuming the output path is the only cause.

These gaps must be addressed before enabling an unattended schedule.

## 6. Architecture decision

### 6.1 Logical architecture

```text
                           +----------------------+
                           | GitHub Actions cron  |
                           | + workflow_dispatch  |
                           +----------+-----------+
                                      |
                                      | starts one bounded slice
                                      v
                           +----------------------+
                           | Pipeline slice runner|
                           | lease + deadline +   |
                           | budget guard         |
                           +----+------------+----+
                                |            |
                      search    |            | email
                                v            v
                        +-------+----+  +----+-------+
                        | Tavily API |  | Resend API |
                        +------------+  +------------+
                                |
                                | trend signals and corroboration
                                v
 +--------------+      +-------+-----------------------------------+
 | RSS outlets  +----->| Hosted PostgreSQL                         |
 +--------------+      |                                          |
                       | crawl queue, articles, moderation state,  |
                       | analysis attempts, verdicts, run state,   |
                       | budget reservations, usage ledger         |
                       +-------------------+----------------------+
                                           |
                                           | reads published state
                                           v
                                +----------+-----------+
                                | Vercel Next.js app   |
                                | site + API + admin   |
                                +----------------------+
```

### 6.2 Why GitHub Actions first

Standard GitHub-hosted runners are free for public repositories and provide enough CPU and memory for the Cheerio-based Crawlee path. They avoid a permanently running worker and keep infrastructure cost near zero.

The production worker is browserless by default. The active RSS and article crawler uses `CheerioCrawler`; Playwright is referenced only by standalone test/legacy Google News paths that are not wired into the production package scripts. Do not install Chromium in the scheduled workflow. Reintroducing a browser requires measured extraction failures from approved free outlets and a separate OpenSpec change.

The six-hour job limit is acceptable only after the pipeline becomes sliceable and resumable. The planned timeout is 330 minutes, with a soft processing deadline at 285 minutes. This leaves 45 minutes for the current unit of work, metrics, email, and cleanup.

GitHub Actions is not a durable queue. PostgreSQL owns all state required to resume.

### 6.3 Fallback worker

Move the same runner to a small VPS or a container-job service only if one of these conditions remains true for two consecutive weeks:

- A normal daily slice repeatedly reaches the deadline.
- Measured free-outlet extraction failures demonstrate that static HTTP parsing is insufficient.
- GitHub scheduling delay causes unacceptable freshness.
- The repository becomes private and Actions minutes become material.

The runner contract must therefore be a normal CLI command with environment variables, not logic embedded in YAML.

## 7. Pipeline execution model

### 7.1 Slice contract

Add a root command with a contract equivalent to:

```text
npm run pipeline:run-slice -- \
  --max-runtime-minutes=285 \
  --max-new-articles=40 \
  --max-analysis-articles=40 \
  --trigger=scheduled
```

The command must:

1. Validate required configuration.
2. Acquire the singleton pipeline lease.
3. Load or create the active pipeline run.
4. Read the current monthly budget state.
5. Execute stages in order until complete, blocked, budget-exhausted, or near deadline.
6. Persist a checkpoint after every bounded unit of work.
7. Release the lease.
8. Send a run receipt.
9. Return success when useful progress was saved, even if backlog remains.
10. Return failure only for an unrecoverable slice error or invalid configuration.

### 7.2 Run and stage state

```text
PipelineRun
  queued
    |
    v
  running <-------------------------------+
    |                                     |
    +--> completed                        |
    +--> paused_budget                    |
    +--> paused_deadline ---- next slice -+
    +--> blocked_moderation               |
    +--> failed_recoverable -- retry -----+
    +--> failed_terminal
```

Each stage follows:

```text
pending -> running -> completed
              |
              +-> paused_deadline
              +-> paused_budget
              +-> failed_recoverable
              +-> failed_terminal
```

The runner must heartbeat at least every five minutes and after every checkpoint. A lease is stale after 15 minutes without a heartbeat.

### 7.3 Stage order

1. Preflight and lease acquisition.
2. Tavily trend collection.
3. RSS refresh and crawl-request creation.
4. Match Tavily signals to approved topics and queued articles, then compute processing priority.
5. Bounded article extraction using the priority allocation.
6. Incremental topic discovery.
7. Tavily corroboration and topic moderation policy.
8. Incremental topic matching.
9. Incremental question discovery for approved topics.
10. Question validation and moderation policy.
11. Incremental stance classification.
12. Verdict recalculation for touched question-month pairs.
13. Content generation for touched verdicts that lack required display content.
14. Metrics, queue summary, email receipt, and lease release.

Stages with no eligible work must complete without error.

### 7.4 Incremental work selection

Do not use a numeric offset over a mutating table as the only cursor. Prefer a stable tuple:

```text
(createdAt, id)
```

Each stage stores its last processed tuple and its input window. Queries are ordered by the same tuple and limited to a configured batch.

Existing domain-level idempotency remains the second line of defense:

- `CrawlRequest.url` is unique.
- `Article.url` is unique.
- `TopicArticle(topicId, articleId)` is unique.
- `ArticleAnalysisAttempt(articleId, questionId, month)` is unique.
- `Verdict(questionId, month)` is unique.

### 7.5 Backlog and steady-state scheduling

Backlog mode:

- Schedule at 00:15, 06:15, 12:15, and 18:15 UTC.
- Each slice processes at most 40 new articles and 40 analysis articles.
- If a slice finds no meaningful backlog, it records that fact and exits quickly.

Steady-state mode:

- Keep the same six-hour trigger but use a database `nextEligibleAt` gate.
- Perform the full daily run once per 24 hours.
- Later triggers only retry failed or remaining work.

This avoids editing cron schedules during catch-up and gives failed work a bounded retry delay.

## 8. Database additions

### 8.1 `PipelineRun`

Recommended fields:

- `id`
- `trigger`: scheduled, manual, retry
- `status`
- `startedAt`
- `heartbeatAt`
- `finishedAt`
- `deadlineAt`
- `nextEligibleAt`
- `ownerToken`
- `summary` JSON
- `errorCode`
- `errorMessage`
- `createdAt`
- `updatedAt`

Only one run may hold an active lease. Enforce this in a transaction or advisory lock.

### 8.2 `PipelineStageRun`

Recommended fields:

- `id`
- `pipelineRunId`
- `stage`
- `status`
- `cursor` JSON
- `attempts`
- `startedAt`
- `heartbeatAt`
- `finishedAt`
- `metrics` JSON
- `errorCode`
- `errorMessage`

Add a unique constraint on `(pipelineRunId, stage)`.

### 8.3 `LlmUsage`

Recommended fields:

- `id`
- `pipelineRunId`
- `stage`
- `operation`
- `provider`
- `model`
- `promptTokens`
- `completionTokens`
- `estimatedCostUsd`
- `providerRequestId`
- `createdAt`

This is the audit ledger. It must be populated from the central OpenAI provider rather than separately in every script.

### 8.4 `LlmBudgetReservation`

Recommended fields:

- `id`
- `month`
- `pipelineRunId`
- `operation`
- `reservedCostUsd`
- `actualCostUsd`
- `status`: reserved, settled, expired
- `expiresAt`
- `createdAt`
- `updatedAt`

Before an LLM request, reserve a conservative maximum cost in a transaction. Reject the request if:

```text
settled monthly cost + active reservations + requested reservation
  > application LLM monthly ceiling
```

After a response, settle the reservation with actual token usage. Expired reservations are released only after confirming their owning run has no active lease.

### 8.5 `TrendSignal`

Recommended fields:

- `id`
- `query`
- `title`
- `url`
- `domain`
- `publishedAt`
- `score`
- `matchedTopicId`
- `matchedArticleId`
- `matchedCrawlRequestId`
- `pipelineRunId`
- `rawResult` JSON
- `createdAt`

Deduplicate by normalized URL within a retention window. Retain detailed results for 30 days and aggregate counts longer if useful.

## 9. Tavily design

### 9.1 Role

Tavily is a trend, prioritization, and corroboration input. It does not replace RSS ingestion, article extraction, or the Acta evidence model.

Its outputs are used to:

- Rank approved topics for the current slice.
- Rank queued RSS articles and extracted-but-unanalyzed articles before capped work is claimed.
- Identify likely gaps in the current topic set.
- Corroborate pending topics with independent domains.
- Include evidence in the moderation email.

Tavily content must not directly become a published verdict without going through the normal article and stance pipeline.

### 9.2 Query budget

Initial configuration:

- Five basic searches per daily full run.
- Maximum 155 searches in a 31-day month.
- No paid overage.
- Stop Tavily work when free credits are exhausted.

This stays far below the current 1,000-credit free allocation and gives room for manual tests.

Suggested query groups:

1. Global politics and security.
2. Climate and energy.
3. Technology and AI.
4. Economics and trade.
5. Public health and social policy.

Queries should request recent results and use the same language as the current topic taxonomy.

### 9.3 Topic and article matching

Normalize Tavily titles, snippets, and domains. Match signals to approved topics using:

1. Deterministic aliases and token overlap.
2. Existing topic matching logic.
3. A cheap LLM only for ambiguous candidates.

Match Tavily results to articles and crawl requests using:

1. Canonical URL equality after normalization.
2. Source-domain plus normalized-title similarity.
3. Publication time proximity when available.
4. No LLM call for article matching.

Persist `matchedArticleId` or `matchedCrawlRequestId` when a match is strong enough. Unmatched Tavily URLs remain trend signals; they are not inserted as Acta evidence unless the URL later arrives through an approved ingestion path.

### 9.4 Budget-aware priority allocation

Every capped extraction and analysis stage must consult priority before claiming work:

```text
priority score =
  topic trend score
  + exact Tavily article match boost
  + recency score
  + backlog age score
```

Initial allocation:

- 70% of each capped slice goes to the highest-scoring Tavily/topic/article work.
- 30% goes to oldest eligible work regardless of trend score.
- Unused capacity in either pool flows to the other pool.

This gives current stories most of the USD 50-constrained capacity without permanently starving older articles. Priority affects ordering only. It never bypasses approved outlets, moderation rules, idempotency, evidence thresholds, or the LLM budget guard.

Before each slice, estimate affordable analysis units from remaining monthly budget and recent average unit cost. The lower of the configured article cap and affordable-unit estimate becomes the effective cap. The receipt must report configured cap, budget-derived cap, effective cap, and work skipped due to budget.

### 9.5 Auto-approval rollout

Auto-approval is a policy, not an unconditional LLM decision.

#### Level 0: email-only shadow mode

Duration: at least seven successful daily runs.

- All auto-discovered topics stay pending.
- The email states which topics the policy would approve and why.
- The owner can compare policy decisions with admin decisions.

#### Level 1: constrained topic auto-approval

A pending topic may be approved only when all conditions hold:

- Discovery confidence is at least 0.80 and is persisted with the candidate.
- At least three successfully extracted articles support it.
- Supporting articles come from at least two approved outlets.
- Tavily returns at least three corroborating results from at least two distinct domains.
- The candidate is not a near-duplicate of an approved topic.
- The candidate is not marked safety-sensitive.
- The candidate name and description pass validation.
- The monthly budget guard permits downstream processing.

The decision, thresholds, evidence IDs, Tavily URLs, and policy version must be stored in the run summary and included in email.

#### Level 2: constrained question auto-validation

This is disabled by default and should be a later Phase 1 ticket.

A question may be validated and activated only when:

- Its topic is approved.
- BAR validation passes without a reformulation requirement.
- It has evidence from at least three articles and two outlets.
- It is not a near-duplicate of an active question.
- It is not safety-sensitive.
- A shadow-mode evaluation shows an acceptable false-approval rate.

Safety-sensitive candidates always remain pending.

### 9.6 Policy configuration

Thresholds must be environment-backed and recorded with each decision:

```text
AUTO_APPROVE_TOPICS=false
AUTO_VALIDATE_QUESTIONS=false
TOPIC_AUTO_APPROVE_MIN_CONFIDENCE=0.80
TOPIC_AUTO_APPROVE_MIN_ARTICLES=3
TOPIC_AUTO_APPROVE_MIN_OUTLETS=2
TOPIC_AUTO_APPROVE_MIN_TAVILY_RESULTS=3
TOPIC_AUTO_APPROVE_MIN_TAVILY_DOMAINS=2
```

Changing a policy must not rewrite past decisions.

## 10. Cost-control design

### 10.1 Monthly envelope

Initial allocation:

- OpenAI application ceiling: USD 30.
- Hosted PostgreSQL: USD 0 target, USD 8 operational allowance.
- Tavily: USD 0, free plan with no paid overage.
- Resend: USD 0, free transactional plan.
- GitHub Actions: USD 0 for standard runners on the public repository.
- Vercel: USD 0 on Hobby while the project remains personal and non-commercial.
- Reserve: USD 12.

The reserve covers database growth, pricing changes, or a small operational mistake. It is not automatically spendable by the LLM worker.

### 10.2 Enforcement layers

1. Provider account protection:
   - Use prepaid credit or the strictest provider-level billing control available.
   - Configure alerts at 50%, 75%, and 90%.

2. Application monthly budget:
   - Stop new OpenAI reservations at USD 30.
   - Refuse to start expensive stages when remaining budget is below the stage minimum.

3. Work caps:
   - Maximum articles extracted per slice.
   - Maximum analysis articles per slice.
   - Existing question prefilter.
   - Maximum questions per topic and per article.
   - Cheap model for classification, validation, and convergence.

4. Deadline:
   - Stop claiming new work after 285 minutes.

5. Degradation:
   - Continue RSS collection and deterministic calculations when LLM budget is exhausted.
   - Defer discovery, classification, and generation.
   - Keep serving the last published verdicts.

### 10.3 Budget correctness

The provider's current token-cost log is useful but not sufficient. The central provider must report every response to `LlmUsage`.

Reservation pricing should use conservative per-model input and output estimates. The final USD 30 application ceiling leaves USD 20 of total-project headroom, so small estimation errors cannot push the whole system over USD 50.

## 11. Email notification design

### 11.1 Messages

Send:

- One receipt after every full or retry slice.
- An immediate failure email for a terminal slice error.
- One daily moderation digest when pending items exist.
- Budget warnings at application usage thresholds.

Avoid one email per article or candidate.

### 11.2 Receipt contents

Subject examples:

```text
[Acta] Pipeline completed: 31 articles, 8 verdicts updated
[Acta] Pipeline paused: monthly LLM budget reached
[Acta] Pipeline failed: stance classification
```

Body:

- Run ID, trigger, start, duration, and status.
- Links to the production site and admin moderation view.
- Tavily searches and matched topics.
- Topics discovered, auto-approved, and left pending.
- Questions discovered, validated, and left pending.
- Articles discovered, extracted, failed, and waiting.
- Classifications attempted, stored, and skipped.
- Verdicts recalculated and content generated.
- Current queue depths.
- Estimated LLM cost for the run and month.
- Remaining application budget.
- Recoverable and terminal errors.
- Whether another slice is required.

Email failure must be logged but must not change a successful pipeline result.

## 12. GitHub Actions design

### 12.1 Workflow triggers

Use:

- `schedule` every six hours.
- `workflow_dispatch` with optional safe overrides.
- No execution on ordinary pushes.

### 12.2 Concurrency

Use one concurrency group:

```text
acta-production-pipeline
```

Set `cancel-in-progress: false`. A second trigger should wait or exit after failing to acquire the database lease. It must not cancel a healthy slice.

### 12.3 Job outline

```text
checkout
  -> setup Node 20
  -> npm ci
  -> prisma generate
  -> production configuration preflight
  -> migrate deploy
  -> pipeline:run-slice
  -> upload small diagnostic summary on failure only
```

Set `timeout-minutes: 330`.

Do not upload article text, environment files, database dumps, browser profiles, or raw provider responses as artifacts.

### 12.4 Required secrets

- `DATABASE_URL`
- `OPENAI_API_KEY`
- `TAVILY_API_KEY`
- `RESEND_API_KEY`
- `PIPELINE_EMAIL_TO`
- `PIPELINE_EMAIL_FROM`

`PIPELINE_EMAIL_TO` contains the private owner destination and must exist only as a GitHub Actions environment secret. The address must never appear in tracked files, OpenSpec artifacts, issue bodies, logs, test fixtures, workflow YAML, or email snapshots. Tests use a reserved example-domain address.

Repository-governance automation separately requires a read-only Linear credential, stored as `LINEAR_API_KEY` in GitHub Actions and the local secret store. It may read issue descriptions and statuses for consistency checks but must not update workflow state from CI. Agent-driven status updates use the authenticated Linear integration and occur only after the corresponding transition has actually happened.

Vercel separately requires:

- `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- Any runtime OpenAI variables needed by API routes.

Paywall credentials are excluded from the initial cloud worker.
Playwright and Chromium are excluded from the initial cloud worker. The scheduled production path supports only RSS and free article pages extractable through static HTTP/Cheerio.

### 12.5 Permissions

The workflow should default to:

```text
contents: read
```

No repository write token is required. Environment protection may be used for production secrets without adding a per-run approval gate.

## 13. Deployment plan

### 13.1 Hosted PostgreSQL

1. Measure the current logical database size.
2. Create a Neon project in the closest practical region to Vercel.
3. Restore the latest local dataset.
4. Apply `prisma migrate deploy`.
5. Verify row counts and representative question pages.
6. Configure pooled connections for Vercel and a direct connection for migrations and the worker if Neon recommends separate URLs.
7. Keep one manual snapshot before enabling writes.

The current SQL dump size suggests the database may fit the free tier, but logical database size must be measured rather than inferred from dump size.

### 13.2 Vercel

Vercel recovery is the first cloud blocker and must be completed before database migration or worker scheduling.

1. Capture the current failed deployment logs and classify the failure as install, build, environment, output, or runtime.
2. Remove any explicitly configured Vercel `NODE_ENV`; Vercel/Next.js must build with `NODE_ENV=production`.
3. Add a configuration assertion that rejects non-production `NODE_ENV` in production builds.
4. Resolve the `distDir` and `outputDirectory` mismatch if the deployment log confirms it.
5. Reproduce Vercel's clean install and production build in Linux CI.
6. Add production environment variables without exposing their values.
7. Deploy from `main`.
8. Verify `/`, `/api/health`, one topic, one question, and `/admin/login`.
9. Confirm the website reads from hosted PostgreSQL.

Local evidence gathered for this plan:

- `npm run build --workspace=@acta/web` fails with broad prerender `useContext` errors when the shell inherits `NODE_ENV=development`.
- `NODE_ENV=production npm run build --workspace=@acta/web` succeeds.

This is a verified local failure mode, not proof that it is the only Vercel failure. The deployment logs remain authoritative.

### 13.3 Worker

1. Add slice-safe orchestration and checkpoints.
2. Run against a staging branch or copied database with small caps.
3. Run `workflow_dispatch` against production with a five-article cap.
4. Inspect the email, usage ledger, checkpoint, and public pages.
5. Enable the schedule in shadow moderation mode.

## 14. Reliability and failure handling

### 14.1 Failure matrix

#### Runner killed or timed out

- Detection: stale lease heartbeat.
- Recovery: next slice expires the lease and resumes from the last checkpoint.
- User visibility: next receipt notes stale-run recovery.

#### Duplicate scheduled trigger

- Detection: database lease already held.
- Recovery: second invocation exits successfully without work.
- User visibility: no extra email unless repeated contention indicates a defect.

#### PostgreSQL unavailable

- Detection: preflight connection fails.
- Recovery: exponential retry for a short bounded period, then fail the slice.
- User visibility: failure email may not be possible if run state cannot be stored; GitHub's native failure notification remains the fallback.

#### OpenAI rate limit or transient error

- Detection: provider response.
- Recovery: existing retry policy, then stage checkpoint and recoverable failure.
- User visibility: receipt lists deferred work.

#### Monthly LLM budget reached

- Detection: reservation rejected.
- Recovery: pause expensive stages until next month or a deliberate configuration change.
- User visibility: budget email and admin health state.

#### Tavily unavailable or credits exhausted

- Detection: API error or quota response.
- Recovery: continue RSS and existing-topic analysis; do not auto-approve new candidates.
- User visibility: degraded trend status in receipt.

#### Resend unavailable

- Detection: send failure.
- Recovery: log failure in run summary; do not fail successful pipeline work.
- User visibility: GitHub Actions status remains the fallback.

#### Bad article or blocked outlet

- Detection: extraction failure.
- Recovery: increment attempts, store concise error, continue the batch.
- User visibility: aggregate by outlet in receipt.

#### Partial moderation policy failure

- Detection: required evidence missing or inconsistent.
- Recovery: leave candidate pending.
- User visibility: digest explains which condition failed.

## 15. Security and data handling

- Store secrets only in GitHub Actions environments and Vercel encrypted variables.
- Keep workflow permissions read-only.
- Never print connection strings, API keys, paywall credentials, session cookies, or full provider payloads.
- Sanitize errors before storing or emailing them.
- Do not upload database dumps as Actions artifacts.
- Continue protecting `/admin` with the existing signed session cookie.
- Rate-limit or otherwise protect admin login before advertising the site broadly.
- Keep automatic moderation decisions auditable with policy version and evidence.
- Exclude paywalled browser sessions from initial cloud execution.

## 16. Observability and operational targets

### 16.1 Minimum metrics

- Last successful full run.
- Last successful stage.
- Active run and heartbeat age.
- Pending, in-progress, failed, and exhausted crawl requests.
- New articles per run.
- Analysis attempts and skipped existing attempts.
- Pending moderation counts.
- Auto-approval counts and reasons.
- Tavily credits estimated or requests issued.
- OpenAI tokens and estimated USD by model, operation, run, and month.
- Consecutive failed slices.
- Oldest unprocessed article age.

### 16.2 Initial service targets

- Public health endpoint succeeds at least 99% of monthly checks.
- A new eligible RSS article is processed within 48 hours in steady state.
- No healthy slice exceeds 330 minutes.
- No two workers process the same stage concurrently.
- Monthly application-accounted LLM cost does not exceed USD 30.
- Total known project cost does not exceed USD 50.
- Every scheduled full run produces a stored summary.
- Every auto-approval is explainable from stored evidence.

These are operational targets for a hobby service, not contractual SLAs.

### 16.3 Health surfaces

Keep public `/api/health` simple and safe. Add an authenticated admin operational endpoint that reports:

- Last run status.
- Heartbeat age.
- Queue counts.
- Pending moderation counts.
- Budget state.
- Data freshness.

Do not expose costs, errors, candidate data, or internal queue details publicly.

## 17. Testing strategy

### 17.1 Unit tests

Cover:

- Stable cursor encoding and advancement.
- Deadline decisions.
- Lease acquisition, renewal, contention, and stale takeover.
- Stage state transitions.
- Budget reservation, settlement, expiry, and concurrent rejection.
- Tavily normalization and deduplication.
- Trend-to-topic matching.
- Every auto-approval policy condition.
- Safety-sensitive hold behavior.
- Email rendering and redaction.
- Cost calculation by model.

### 17.2 Integration tests

Use PostgreSQL to verify:

- A killed slice resumes without duplicate domain records.
- Two runners cannot hold the production lease.
- Stage cursors only advance after successful units.
- Failed units remain eligible for retry.
- Budget reservations remain correct under concurrent requests.
- Existing idempotency constraints prevent duplicates.
- Migration deploy succeeds from an empty schema and from the current production-like schema.

### 17.3 Provider contract tests

Mock HTTP boundaries to verify:

- Tavily success, empty result, malformed result, timeout, and quota exhaustion.
- OpenAI usage settlement on success and reservation handling on failure.
- Resend success, rejection, timeout, and redacted error logging.

No live provider call should be required for the normal test suite.

### 17.4 End-to-end smoke test

With strict caps:

```text
hosted DB clone
  -> one Tavily query
  -> one RSS outlet
  -> up to two extracted articles
  -> one analysis unit
  -> one verdict recalculation
  -> one email receipt
  -> web health and representative page checks
```

Run this manually before production scheduling and on demand after infrastructure changes.

### 17.5 Ticket specifications, PR readiness, and adversarial review

Use the OpenSpec framework from https://openspec.dev/. Initialize the repository with the default spec-driven workflow:

```text
openspec/
├── config.yaml
├── specs/                         # Current system behavior
│   └── <capability>/spec.md
└── changes/
    └── <ticket-change-id>/
        ├── proposal.md            # Why and what
        ├── design.md              # How
        ├── tasks.md               # Checked implementation plan
        └── specs/
            └── <capability>/
                └── spec.md        # ADDED/MODIFIED/REMOVED requirements
```

Linear is the project-management source for Phase 1 tickets and workflow status. GitHub is used for code branches, CI, pull requests, and merge protection.

Every Linear implementation ticket maps one-to-one to an OpenSpec change and one GitHub pull request:

```text
Linear issue CAI-123
  <-> OpenSpec change p1-07-pipeline-run-slice
  <-> openspec/changes/p1-07-pipeline-run-slice/
  <-> one GitHub implementation pull request
```

The ticket body must contain:

- The exact OpenSpec change ID.
- The proposal summary.
- The affected capabilities.
- A copy of the delta requirements and Given/When/Then scenarios.
- A link to the change directory after the implementation branch is pushed.
- The required unit, integration, and end-to-end test mapping.
- Any open questions.

The repository OpenSpec artifacts are the machine-validated specification. The Linear issue description is a required portable mirror. `verify:pr-ready` must fail when the Linear ticket and repository delta specs differ.

#### Linear workflow

Use the existing `Caio Vaccaro` team workflow and the `Acta` project. Avoid adding workflow administration unless it becomes necessary:

```text
Backlog
  -> Todo              OpenSpec artifacts pass strict validation and open questions are closed
  -> In Progress       OpenSpec work or /opsx:apply has started
  -> In Review         pre-PR gate passed and GitHub PR is open
  -> Done              PR merged and /opsx:archive completed

Apply a Blocked label while preserving the current status when work cannot advance.
```

The similarly named `To Do` status is not used for this project. The agent updates Linear at every transition and adds the GitHub PR URL when entering `In Review`. External status changes are monitored through the Linear integration. Ticket status must reflect actual work; opening a branch alone does not move a ticket to `In Progress`.

Configure OpenSpec rules to require:

- Given/When/Then scenarios in every delta requirement.
- Happy path, boundary, failure, recovery, security, and cost scenarios where relevant.
- A rollback section in every proposal.
- Architecture and data-flow diagrams for long-running or stateful changes.
- Unit, integration, and end-to-end test tasks in every `tasks.md`.
- An empty open-questions section before implementation is PR-ready.

The intended lifecycle is:

```text
Linear issue created with OpenSpec seed
  -> /opsx:propose creates proposal, delta specs, design, and tasks
  -> Linear issue scenarios and repository delta specs synchronized
  -> /opsx:apply implements tasks
  -> all tests pass
  -> /opsx:verify confirms implementation matches artifacts
  -> verify:pr-ready confirms Linear/OpenSpec/test consistency
  -> PR may be created
  -> CI and adversarial review
  -> fixes and re-verification
  -> merge
  -> /opsx:archive merges delta specs into openspec/specs
```

Required delta-spec style:

```markdown
## ADDED Requirements

### Requirement: Bounded pipeline slice

The worker SHALL stop claiming new work before its configured soft deadline.

#### Scenario: Deadline reached with backlog remaining

- GIVEN a running slice with unprocessed eligible work
- AND the soft deadline has been reached
- WHEN the current atomic unit finishes
- THEN the stage cursor is persisted
- AND the run status is `paused_deadline`
- AND the process exits successfully
```

#### Mandatory acceptance criteria for every ticket

In addition to its ticket-specific criteria, every ticket must satisfy all of the following:

- `/opsx:propose` has produced `proposal.md`, delta `specs/`, `design.md`, and `tasks.md`.
- `openspec validate --strict` passes for the change.
- The Linear issue's copied requirements and scenarios match the repository delta specs.
- The OpenSpec change is complete, internally consistent, and has no unresolved open questions.
- Implementation behavior, configuration, migrations, documentation, and diagrams agree with the OpenSpec artifacts.
- Unit tests cover the ticket's decision logic, boundaries, and error paths.
- Integration tests cover the ticket's real module, database, process, or provider boundary.
- An end-to-end test covers the ticket's externally observable result from its supported entry point.
- Existing regression tests pass.
- New tests fail against the pre-change behavior when that is technically meaningful.
- `/opsx:verify` confirms the implementation matches the OpenSpec change.
- `npm run verify:pr-ready -- --issue=<linear-identifier>` passes locally before a pull request is created.
- The verification report identifies the Linear issue, OpenSpec change ID, artifact hashes, test commands, and tested commit SHA.

For operational or documentation-heavy tickets, “end-to-end” still means exercising the complete behavior. Examples include validating a deliberately malformed ticket, running a migration against an empty database, executing a workflow against a fixture, or following a deployment runbook against a disposable environment.

#### Pre-PR gate

GitHub cannot technically prevent a user from opening a pull request. The pre-creation rule is therefore enforced by the repository command and contributor policy:

```text
Linear ticket OpenSpec seed complete
  -> proposal + delta specs + design + tasks
  -> openspec validate --strict
  -> unit tests
  -> integration tests
  -> end-to-end tests
  -> full regression suite
  -> /opsx:verify
  -> verify Linear/repository scenario consistency
  -> PR may be created
```

No draft PR is created before this gate passes. `verify:pr-ready` must fail closed when it cannot read the Linear issue, when the OpenSpec change is missing or invalid, when ticket scenarios differ from delta specs, when open questions remain, when a required test class is missing, or when any test command fails.

#### Post-open PR gates

After the PR is opened:

```text
PR opened
  -> clean CI rerun
  -> openspec validate --strict
  -> Linear/OpenSpec consistency check
  -> adversarial review
  -> findings created as blocking review threads/checks
  -> author fixes every actionable finding
  -> tests rerun
  -> adversarial review reruns when material code changes
  -> all checks green and all blocking findings resolved
  -> merge allowed
```

The adversarial review must read the Linear issue, OpenSpec artifacts, implementation diff, and tests. It must attempt to break the change, not summarize it. It must inspect:

- Divergence among the Linear issue, OpenSpec artifacts, implementation, and tests.
- Missing error paths and unsafe assumptions.
- Retry, concurrency, idempotency, and timeout failures.
- Security, secret exposure, and authorization mistakes.
- Cost-cap bypasses and unbounded work.
- Migration safety and rollback behavior.
- Missing or superficial unit, integration, and end-to-end coverage.
- Silent failure modes and misleading observability.

Every candidate finding must be validated against the code and ticket specification. A false positive may be closed only when the review automation accepts the contrary evidence and no longer reports it. Every validated issue is blocking and must be fixed. There is no owner waiver for a confirmed issue. The adversarial check must pass after the fix. Unresolved findings, stale reviews, inconsistent specifications, or failing tests prevent merge through branch protection.

#### Required repository controls

- Pull requests must reference exactly one primary Linear implementation ticket.
- The PR template must include the Linear issue identifier and URL, OpenSpec change ID, artifact hashes, `/opsx:verify` result, pre-PR verification report, and test evidence.
- Branch protection on `main` must require CI, specification validation, and adversarial review checks.
- Conversations must be resolved before merge.
- Direct pushes to `main` must be disabled.
- Stale approvals must be dismissed after material changes.
- Administrator bypass should remain disabled for normal work.

## 18. Delivery sequence

### Milestone -1: Specification and PR governance

Purpose: Establish the rules that every later Phase 1 ticket and pull request must satisfy.

Work:

- Install and initialize OpenSpec.
- Configure the spec-driven workflow and Given/When/Then rules.
- Add the Linear issue/OpenSpec seed template and status-transition mapping.
- Add the pull-request template.
- Add `verify:pr-ready`.
- Define unit, integration, end-to-end, and regression test commands in OpenSpec task rules.
- Add strict OpenSpec and Linear-issue mirror consistency validation.
- Add the adversarial PR review workflow and branch-protection checklist.

Exit criteria:

- A fixture Linear ticket with an incomplete spec is rejected.
- A malformed OpenSpec change fails strict validation.
- Divergent Linear issue and repository scenarios are rejected.
- A fixture change with a failing unit, integration, or end-to-end test is rejected.
- A compliant fixture passes `/opsx:verify` and produces a commit-bound verification report.
- A test PR receives an adversarial review result.
- A blocking adversarial finding prevents merge until fixed and reviewed again.

### Milestone 0: Correctness prerequisites

Purpose: Restore deployability, then make the existing scripts safe to orchestrate.

Work:

- Diagnose and restore the failing Vercel production deployment.
- Enforce `NODE_ENV=production` for production builds and verify a clean Linux build.
- Resolve Vercel output-path configuration if confirmed by deployment evidence.
- Fix outlet filtering in `refreshFeeds.js`.
- Make the main crawler honor explicit article caps.
- Keep the production crawler browserless; remove Playwright from scheduled-worker installation and production dependency scope if no wired path requires it.
- Establish a single production configuration schema.
- Verify `npm ci`, Prisma generation, tests, and Next.js build in Linux CI.

Exit criteria:

- A capped local run processes no more than its configured limit.
- All workspace tests pass.
- Vercel production deploy and preview build successfully.

### Milestone 1: Cloud website and database

Purpose: Put the read path in the cloud before adding automated writes.

Work:

- Provision and restore hosted PostgreSQL.
- Deploy Vercel against hosted PostgreSQL.
- Apply production migrations.
- Add deployment smoke checks.

Exit criteria:

- Production health reports connected.
- Homepage, topic, question, API, and admin login work.
- No pipeline worker is scheduled yet.

### Milestone 2: Resumable pipeline core

Purpose: Make long work safe across disposable runners.

Work:

- Add run, stage, lease, and checkpoint models.
- Add the slice runner.
- Refactor each long loop to process bounded units and honor a deadline.
- Add recovery and idempotency integration tests.

Exit criteria:

- A deliberately interrupted local slice resumes.
- Two simultaneous runners do not duplicate work.
- A non-empty backlog can require multiple successful slices.

### Milestone 3: Budget guard and usage ledger

Purpose: Protect the monthly ceiling before scheduling LLM work.

Work:

- Centralize provider usage callbacks.
- Add reservations and settlement.
- Add per-stage caps and degraded operation.
- Add budget status to run summaries.

Exit criteria:

- Concurrent tests cannot reserve above the monthly ceiling.
- The pipeline pauses expensive stages and continues cheap stages at the limit.

### Milestone 4: Tavily and moderation shadow mode

Purpose: Reduce manual topic selection without risking silent publication.

Work:

- Add Tavily client and trend-signal persistence.
- Add matching and prioritization.
- Add auto-approval policy evaluator.
- Run policy in shadow mode.

Exit criteria:

- Every proposed approval includes stored evidence and failed/passed conditions.
- No shadow-mode candidate is published automatically.

### Milestone 5: Email and production schedule

Purpose: Operate without watching a terminal.

Work:

- Add Resend notifications.
- Add GitHub Actions scheduled and manual workflows.
- Add operational summary and native GitHub fallback.
- Enable backlog schedule with low caps.

Exit criteria:

- A production slice runs unattended.
- The owner receives a useful receipt.
- A forced failure is visible in GitHub and email when possible.

### Milestone 6: Controlled auto-approval

Purpose: Remove routine topic moderation after evidence from shadow mode.

Work:

- Review at least seven shadow-mode digests.
- Record false-positive and false-negative observations.
- Enable Level 1 topic auto-approval if the policy is acceptable.
- Keep question auto-validation disabled until separately evaluated.

Exit criteria:

- Eligible topics are approved and processed without a human gate.
- Ineligible and safety-sensitive topics remain pending.
- Every decision is reversible and auditable.

## 19. Ticket map

The following tickets are OpenSpec change seeds. When a Linear issue is created, materialize its seed with `/opsx:propose`, copy the resulting delta requirements and scenarios into the issue, and keep both representations synchronized. The repository OpenSpec artifacts remain the machine-validated source.

Every ticket inherits the mandatory acceptance criteria in Section 17.5: valid OpenSpec artifacts, synchronized Given/When/Then scenarios, passing unit tests, passing integration tests, passing end-to-end tests, passing regressions, successful `/opsx:verify`, a successful pre-PR verification report, clean post-open CI, and a passing adversarial review before merge.

### P1-00: Establish specification, test, and PR governance

Depends on: none

OpenSpec change seed: `p1-00-spec-test-pr-governance`

- Problem: Later tickets need an enforceable definition of what may enter a PR and what may merge.
- Required behavior: Initialize OpenSpec, configure Given/When/Then and test rules, provide Linear issue and GitHub PR templates, `verify:pr-ready`, strict OpenSpec validation, Linear-mirror validation, adversarial review automation, status transitions, and branch-protection instructions.
- Interfaces: `npm run verify:pr-ready -- --issue=<linear-identifier>` reads the Linear issue through a read-only API credential and the named OpenSpec change, runs `openspec validate --strict`, compares scenarios, runs declared unit/integration/E2E/regression commands, invokes `/opsx:verify`, and emits a commit-bound report.
- Failure/recovery: Fail closed on missing Linear access, missing or invalid OpenSpec artifacts, divergent scenarios, unresolved questions, missing test classes, stale commit evidence, or failed commands.
- Security/cost: Workflow permissions are read-only; review output and artifacts contain no secrets; adversarial review usage must fit the Phase 1 budget.
- Out of scope: Implementing any product pipeline behavior.
- Unit scenario: GIVEN a ticket or OpenSpec artifact omits a required section, WHEN validation runs, THEN readiness fails with the missing section named.
- Integration scenario: GIVEN synchronized and divergent fixture Linear issues and OpenSpec changes, WHEN consistency validation runs through the mocked Linear boundary, THEN only the synchronized change passes.
- E2E scenario: GIVEN a disposable repository with branch protection, WHEN an incomplete and then compliant test PR are evaluated, THEN only the compliant PR becomes mergeable after adversarial review passes.
- Open questions: Select the adversarial review provider and required GitHub check name before implementation.

Ticket-specific acceptance:

- An incomplete fixture issue cannot become PR-ready.
- A failure in any test class prevents readiness.
- Branch-protection setup is documented and verified against a test PR.
- A blocking adversarial finding prevents merge until fixed and re-reviewed.

### P1-01: Establish Linux CI and production configuration validation

Depends on: P1-00

OpenSpec change seed: `p1-01-linux-ci-config-validation`

- Problem: The project has no repeatable Linux verification or complete production configuration contract.
- Required behavior: Install deterministically, generate Prisma, validate non-secret configuration shape, run all test classes, and build the web app on Linux.
- Interfaces: CI workflow, production config validator, canonical unit/integration/E2E/regression commands.
- Failure/recovery: Fail with variable names and actionable messages, never values.
- Security/cost: CI uses fixtures and service containers, not production credentials or paid provider calls.
- Out of scope: Production deployment.
- Unit scenario: GIVEN missing or invalid production variables, WHEN configuration validation runs, THEN it reports variable names and constraints without values.
- Integration scenario: GIVEN a clean workspace and CI PostgreSQL, WHEN installation, Prisma generation, and workspace tests run, THEN every package completes successfully.
- E2E scenario: GIVEN a clean Linux runner, WHEN the canonical verification command runs, THEN it builds the web app and emits a successful commit-bound report.
- Open questions: None.

Ticket-specific acceptance:

- `npm ci`, Prisma generation, workspace tests, and web build pass on Linux.
- Missing production variables fail with names but never values.
- CI requires no production secrets.
- Unit, integration, and E2E commands are explicit and consumed by `verify:pr-ready`.

### P1-02: Fix crawler caps and outlet filtering

Depends on: P1-01

OpenSpec change seed: `p1-02-crawler-caps-outlet-filtering`

- Problem: The primary crawler does not reliably enforce the documented article cap and outlet filtering references undefined state.
- Required behavior: Resolve selected outlets deterministically, bound extraction claims and completions, return structured counts, and run the production path without Playwright/Chromium.
- Interfaces: Existing crawler CLI plus explicit max-article and outlet arguments; structured run result.
- Failure/recovery: Invalid outlets fail before writes; partial extraction preserves crawl-request states for retry.
- Security/cost: Caps are mandatory in production and cannot be disabled accidentally.
- Out of scope: Analysis, Tavily, paywalled outlet sessions, and JavaScript-rendered extraction.
- Unit scenario: GIVEN outlet filters and an article cap, WHEN crawler arguments are parsed, THEN selected outlets and the exact cap are returned, including zero-work boundaries.
- Integration scenario: GIVEN pending requests for multiple outlets, WHEN the capped claimant runs, THEN it claims only selected outlets and never more than the cap.
- E2E scenario: GIVEN fixture RSS feeds with more eligible articles than the limit, WHEN the crawler completes, THEN persisted extractions do not exceed the configured maximum and remaining work stays retryable.
- Open questions: None.

Ticket-specific acceptance:

- Outlet filtering no longer references undefined state.
- Article extraction never exceeds the configured slice cap.
- Crawler returns structured counts.
- The scheduled-worker dependency and install path contains no browser binary; free-outlet fixture extraction passes through Cheerio.
- Unit, integration, and E2E crawler scenarios pass.

### P1-03: Resolve and verify Vercel monorepo output

Depends on: P1-00

OpenSpec change seed: `p1-03-vercel-monorepo-output`

- Problem: The current Vercel deployment fails after repository cleanup; local evidence also shows non-production `NODE_ENV` causes broad prerender failure, while the output paths may disagree.
- Required behavior: Use deployment logs to identify the actual failure, reject non-production build environment, define one supported Vercel output contract, and verify required routes.
- Interfaces: Vercel configuration, Next.js configuration, production-environment assertion, deploy smoke command.
- Failure/recovery: Build or route mismatch fails before promotion; previous deployment remains available.
- Security/cost: Smoke tests expose no admin credentials and remain inside Vercel Hobby limits.
- Out of scope: Database migration and pipeline scheduling.
- Unit scenario: GIVEN Vercel, Next.js, and build-environment settings, WHEN configuration validation runs, THEN non-production `NODE_ENV` and mismatched output paths are rejected.
- Integration scenario: GIVEN a clean Linux monorepo with `NODE_ENV=production`, WHEN the Next.js build runs, THEN workspace packages and Prisma resolve without local-only paths or prerender errors.
- E2E scenario: GIVEN a preview deployment, WHEN smoke tests request health, homepage, topic, question, and admin login, THEN every route returns its expected status and content marker.
- Open questions: None.

Ticket-specific acceptance:

- Preview and production deploys locate the same build output.
- `/api/health` and representative pages pass smoke checks.
- Unit, integration, and preview E2E tests pass before PR creation.

### P1-04: Provision hosted PostgreSQL and restore production data

Depends on: P1-03

OpenSpec change seed: `p1-04-hosted-postgres-restore`

- Problem: Cloud web and worker processes need one durable production database.
- Required behavior: Provision Neon, restore data, deploy migrations, verify integrity, configure pooled and direct URLs, and document recovery.
- Interfaces: Migration command, restore runbook, integrity-check command, connection-variable contract.
- Failure/recovery: Restore is repeatable into an empty disposable database; failed migration stops deployment; snapshot rollback is documented.
- Security/cost: URLs stay in encrypted environments; initial tier remains free unless measured limits require upgrade.
- Out of scope: Continuous backup beyond provider capabilities.
- Unit scenario: GIVEN a restore manifest and expected integrity checks, WHEN validation runs, THEN missing tables, counts, or representative IDs fail with actionable output.
- Integration scenario: GIVEN empty and production-like PostgreSQL databases, WHEN restore and migration commands run, THEN both finish at the current schema without destructive drift.
- E2E scenario: GIVEN a disposable hosted database branch and Vercel preview, WHEN representative pages load, THEN they display restored records through the deployed API.
- Open questions: Confirm region and measured database size in the ticket.

Ticket-specific acceptance:

- Schema migrations are current.
- Row-count and representative-record checks pass.
- Vercel reads the hosted database.
- Unit, migration integration, and hosted read-path E2E tests pass.

### P1-05: Add pipeline run, stage, and lease models

Depends on: P1-01

OpenSpec change seed: `p1-05-pipeline-run-stage-lease-models`

- Problem: Disposable workers need durable ownership, heartbeat, status, and checkpoint state.
- Required behavior: Add `PipelineRun`, `PipelineStageRun`, lease acquisition, renewal, release, stale takeover, and explicit transition rules.
- Interfaces: Prisma models and repositories described in Section 8.
- Failure/recovery: Transactions prevent dual ownership; stale takeover records the displaced run.
- Security/cost: Internal errors are sanitized; state queries are indexed.
- Out of scope: Executing pipeline stages.
- Unit scenario: GIVEN every allowed and forbidden run transition, WHEN the transition guard evaluates it, THEN only the declared state-machine edges succeed.
- Integration scenario: GIVEN concurrent database clients, WHEN they acquire, heartbeat, release, and reclaim a stale lease, THEN ownership remains singular and auditable.
- E2E scenario: GIVEN two runner processes started together, WHEN both attempt the protected operation, THEN exactly one performs work and the other exits without mutation.
- Open questions: Choose advisory lock versus singleton-row transaction in the ticket.

Ticket-specific acceptance:

- Exactly one active lease can be held.
- Stale leases are recoverable.
- Invalid state transitions are rejected.
- Unit, concurrent integration, and competing-runner E2E tests pass.

### P1-06: Implement stable cursors and bounded stage units

Depends on: P1-02, P1-05

OpenSpec change seed: `p1-06-stable-cursors-bounded-stages`

- Problem: Numeric offsets over mutating tables cannot safely resume multi-run work.
- Required behavior: Select stable `(createdAt, id)` windows, process bounded units, checkpoint only committed work, and stop claiming work near deadline.
- Interfaces: Stage-unit contract, cursor codec, per-stage limits, deadline signal.
- Failure/recovery: A failed unit leaves its cursor unchanged; deleted rows and equal timestamps do not skip later records.
- Security/cost: Unit caps are required in production.
- Out of scope: Cross-stage orchestration.
- Unit scenario: GIVEN equal timestamps, deleted records, empty windows, and deadline boundaries, WHEN cursors advance, THEN ordering is stable and no uncommitted item is skipped.
- Integration scenario: GIVEN a PostgreSQL dataset mutated between pages, WHEN bounded traversal completes, THEN each eligible record is committed exactly once.
- E2E scenario: GIVEN a multi-page stage interrupted after a checkpoint, WHEN a new process resumes, THEN it reaches completion without duplicate domain writes.
- Open questions: None.

Ticket-specific acceptance:

- Every long stage checkpoints after bounded work.
- A restart resumes after the last committed unit.
- Cursor tests cover equal timestamps and deleted records.
- Unit, mutating-dataset integration, and interruption E2E tests pass.

### P1-07: Build `pipeline:run-slice`

Depends on: P1-05, P1-06

OpenSpec change seed: `p1-07-pipeline-run-slice`

- Problem: Independent scripts need one resumable, deadline-aware cloud entry point.
- Required behavior: Implement the slice contract and stage order in Section 7 with leases, heartbeats, checkpoints, summaries, and status codes.
- Interfaces: `pipeline:run-slice` CLI, stage adapter contract, structured summary.
- Failure/recovery: Recoverable stage failures pause and resume; terminal configuration failures stop before paid work.
- Security/cost: Redacted logs, production caps, no secret-bearing artifacts.
- Out of scope: Tavily, email transport, and final budget enforcement.
- Unit scenario: GIVEN stage outcomes, deadlines, and heartbeat states, WHEN orchestration evaluates the next action, THEN it selects the specified status and stage order.
- Integration scenario: GIVEN real run repositories and fixture stage adapters, WHEN a slice pauses or fails recoverably, THEN progress and error state persist at the last committed unit.
- E2E scenario: GIVEN a multi-stage backlog, WHEN one process is terminated and later slices resume, THEN the run eventually completes with a coherent summary.
- Open questions: None.

Ticket-specific acceptance:

- A slice completes, pauses, or fails with a persisted reason.
- Backlog remaining is a successful resumable outcome.
- A killed-run recovery test passes.
- Unit, repository integration, and killed-run E2E tests pass.

### P1-08: Add LLM usage ledger

Depends on: P1-05

OpenSpec change seed: `p1-08-llm-usage-ledger`

- Problem: Console cost logs cannot support audit, reporting, or budget enforcement.
- Required behavior: Record model, operation, tokens, estimated cost, run, and stage from the central provider.
- Interfaces: Provider usage callback and `LlmUsage` repository.
- Failure/recovery: Usage persistence failure is visible and blocks further paid requests for that slice to avoid unaccounted spend.
- Security/cost: Never store prompts, completions, API keys, or article text in the ledger.
- Out of scope: Rejecting calls by budget.
- Unit scenario: GIVEN model pricing and token usage, WHEN cost is calculated and mapped, THEN fixed-precision cost and redacted metadata are correct.
- Integration scenario: GIVEN one successful mocked provider response, WHEN the provider completes, THEN exactly one usage row links to its run, stage, operation, and model.
- E2E scenario: GIVEN a capped fixture analysis, WHEN the slice finishes, THEN its email/run summary includes the same ledger cost without storing prompt content.
- Open questions: None.

Ticket-specific acceptance:

- Every successful provider call records tokens, model, operation, and estimated cost.
- Sensitive request and response content is not stored in the ledger.
- Unit, provider integration, and run-summary E2E tests pass.

### P1-09: Add transactional monthly budget reservations

Depends on: P1-08

OpenSpec change seed: `p1-09-transactional-llm-budget`

- Problem: Concurrent or long-running LLM work can exceed a log-only monthly budget.
- Required behavior: Reserve conservative cost before each request, reject over-budget work, settle actual usage, expire abandoned reservations safely, and expose remaining budget.
- Interfaces: `LlmBudgetReservation`, budget guard API, USD 30 monthly ceiling.
- Failure/recovery: Uncertain reservations remain conservative until their owner lease is stale.
- Security/cost: All arithmetic uses fixed precision; application ceiling cannot be raised by untrusted CLI input.
- Out of scope: Provider billing configuration.
- Unit scenario: GIVEN reservations across precision and month-boundary cases, WHEN reserve, settle, or expire executes, THEN available budget is conservative and correct.
- Integration scenario: GIVEN concurrent PostgreSQL reservation attempts near the ceiling, WHEN transactions commit, THEN total settled plus reserved cost never exceeds the limit.
- E2E scenario: GIVEN a low test ceiling, WHEN a slice exhausts it, THEN paid stages pause, deterministic stages continue, and the run reports `paused_budget`.
- Open questions: Set conservative per-operation reservation estimates in the ticket.

Ticket-specific acceptance:

- Concurrent calls cannot reserve over USD 30.
- Failed calls settle or expire predictably.
- Expensive stages pause when budget is unavailable.
- Unit, concurrent integration, and budget-exhaustion E2E tests pass.

### P1-10: Integrate Tavily basic search

Depends on: P1-05, P1-07

OpenSpec change seed: `p1-10-tavily-basic-search`

- Problem: The pipeline lacks a broad, current signal for choosing which work consumes capped extraction and LLM budget and for corroborating moderation.
- Required behavior: Execute bounded basic searches, normalize results, deduplicate URLs, persist trend signals, and degrade safely.
- Interfaces: Tavily client, five query groups, request cap, `TrendSignal`.
- Failure/recovery: Timeout, malformed payload, empty results, or quota exhaustion do not block RSS processing.
- Security/cost: API key is secret; paid overage is disabled; daily request cap is explicit.
- Out of scope: Tavily content becoming direct verdict evidence or bypassing approved ingestion.
- Unit scenario: GIVEN duplicate, malformed, and boundary Tavily results, WHEN normalization runs, THEN valid URLs, domains, scores, and request counts are deterministic and capped.
- Integration scenario: GIVEN mocked Tavily success, timeout, malformed, empty, and quota responses, WHEN the client runs, THEN signals persist only when valid and failures return the specified degraded result.
- E2E scenario: GIVEN a fixture daily trend stage, WHEN Tavily succeeds and later exhausts quota, THEN stored signals remain usable and the pipeline continues in degraded mode.
- Open questions: Final query wording may remain configurable but defaults must be specified.

Ticket-specific acceptance:

- Daily searches stay within the configured request cap.
- Empty, failed, and exhausted Tavily responses degrade safely.
- URLs and domains are deduplicated.
- Unit, HTTP/persistence integration, and trend-stage E2E tests pass.

### P1-11: Prioritize topics and articles from Tavily signals

Depends on: P1-10

OpenSpec change seed: `p1-11-tavily-work-prioritization`

- Problem: Regular caps save money only if the highest-value topics and articles are selected before work is claimed.
- Required behavior: Match and rank approved topics, queued RSS articles, and extracted-but-unanalyzed articles; reserve 30% capacity for oldest work; derive effective caps from remaining budget.
- Interfaces: Signal-to-topic matcher, deterministic signal-to-article matcher, priority score, 70/30 allocator, and budget-derived cap consumed by stage selection.
- Failure/recovery: Ambiguous or unmatched signals remain unlinked and never publish content; old work retains guaranteed capacity.
- Security/cost: LLM ambiguity calls use reservations and a strict candidate cap.
- Out of scope: Topic approval.
- Unit scenario: GIVEN exact URL, title/domain, topic alias, ambiguous, duplicate, and unmatched signals plus remaining budget, WHEN scoring and allocation run, THEN matches, effective cap, and 70/30 queues are deterministic.
- Integration scenario: GIVEN persisted signals and eligible topic/article work, WHEN capped stage selection runs, THEN priority and age pools claim the specified proportions without duplicate claims.
- E2E scenario: GIVEN trending and older non-trending fixture topics and articles under a low budget cap, WHEN repeated bounded slices run, THEN trending work runs first and older work is not starved.
- Open questions: Final score weights must be stated in the ticket.

Ticket-specific acceptance:

- Existing approved topics with strong signals are processed first.
- Tavily-matched articles are processed before lower-value recent articles within the priority pool.
- At least 30% of available capacity remains available to oldest eligible work.
- The effective cap never exceeds the budget-derived affordable-unit estimate.
- Unmatched signals cannot directly publish content.
- Unit, ordering integration, and priority E2E tests pass.

### P1-12: Implement moderation policy evaluator

Depends on: P1-10, P1-11

OpenSpec change seed: `p1-12-moderation-policy-shadow`

- Problem: Auto-approval must be explainable, conservative, and testable before it mutates publication state.
- Required behavior: Evaluate every Level 1 condition, persist evidence and policy version, support shadow mode, and hold safety-sensitive candidates.
- Interfaces: Policy input/output contract and environment thresholds from Section 9.5.
- Failure/recovery: Missing, stale, or contradictory evidence produces a pending decision.
- Security/cost: Policy cannot bypass budget or public moderation filters.
- Out of scope: Enabling mutation in production.
- Unit scenario: GIVEN each moderation condition at, above, and below its threshold, WHEN policy evaluation runs, THEN the decision and policy version explain every pass and failure.
- Integration scenario: GIVEN real topic, article, outlet, and trend-signal records, WHEN shadow evaluation runs, THEN it stores an auditable proposal without mutating moderation status.
- E2E scenario: GIVEN approval-ready, incomplete, duplicate, and safety-sensitive candidates, WHEN a shadow slice completes, THEN it proposes only the eligible approval and leaves every status unchanged.
- Open questions: Define the safety-sensitive classifier or deterministic list before implementation.

Ticket-specific acceptance:

- Every condition produces a stored result.
- Safety-sensitive or incomplete candidates stay pending.
- Shadow mode never mutates moderation status.
- Unit, evidence integration, and shadow-policy E2E tests pass.

### P1-13: Add operational and moderation email

Depends on: P1-07, P1-09, P1-12

OpenSpec change seed: `p1-13-operational-moderation-email`

- Problem: Autonomous runs require concise owner-visible outcomes without terminal monitoring.
- Required behavior: Send success, pause, failure, budget, and moderation digest messages with the fields in Section 11.
- Interfaces: Resend adapter, notification service, templates, production/admin links.
- Failure/recovery: Email failure is recorded but never corrupts successful pipeline work.
- Security/cost: Redact secrets and sensitive payloads; aggregate messages; remain within free quotas.
- Out of scope: End-user newsletters.
- Unit scenario: GIVEN success, pause, budget, moderation, and failure summaries containing sensitive values, WHEN templates render, THEN subjects, links, aggregates, and redaction match the specification.
- Integration scenario: GIVEN mocked Resend acceptance, rejection, and timeout responses, WHEN notification delivery runs, THEN attempts and failures are recorded without corrupting pipeline state.
- E2E scenario: GIVEN a successful fixture slice and a forced terminal failure, WHEN both finish, THEN the test transport receives one complete receipt for each outcome.
- Open questions: Confirm the sender domain. The owner provisions the destination address directly as the `PIPELINE_EMAIL_TO` environment secret; it is never copied into the ticket or OpenSpec artifacts.

Ticket-specific acceptance:

- Success, paused, and failed receipts are readable and actionable.
- Email failure does not corrupt pipeline state.
- Messages link to production and admin.
- Unit, Resend integration, and receipt E2E tests pass.

### P1-14: Add production pipeline workflow

Depends on: P1-04, P1-07, P1-09, P1-13

OpenSpec change seed: `p1-14-production-pipeline-workflow`

- Problem: The resumable runner needs unattended cloud scheduling and a safe manual trigger.
- Required behavior: Configure six-hour triggers, dispatch inputs, read-only permissions, 330-minute timeout, dependency installation, migration deploy, and slice execution.
- Interfaces: Production workflow and documented secret contract.
- Failure/recovery: Overlap exits through concurrency and lease controls; native GitHub failure remains available if app email cannot send.
- Security/cost: No secret output, no sensitive artifacts, standard public runner only.
- Out of scope: Self-hosted or paid larger runners.
- Unit scenario: GIVEN workflow YAML and dispatch inputs, WHEN schema and policy validation run, THEN only read-only permissions, bounded timeouts, and safe inputs pass.
- Integration scenario: GIVEN a fixture Actions environment with PostgreSQL and mocked providers, WHEN workflow commands execute, THEN setup, migration, and one slice complete without secret output.
- E2E scenario: GIVEN a manual dispatch against a disposable hosted database, WHEN the workflow runs, THEN a capped slice persists progress and sends its receipt.
- Open questions: None.

Ticket-specific acceptance:

- Job timeout is below GitHub's hard limit.
- Workflow permissions are read-only.
- Concurrency and database lease prevent overlap.
- Production secrets are not printed.
- Unit, workflow integration, and disposable-cloud E2E tests pass.

### P1-15: Add authenticated operational health

Depends on: P1-07, P1-09

OpenSpec change seed: `p1-15-authenticated-operational-health`

- Problem: Public DB health does not show pipeline freshness, queues, moderation, or budget.
- Required behavior: Add an authenticated operational endpoint and owner-facing summary while keeping public health minimal.
- Interfaces: Admin API response contract and dashboard section.
- Failure/recovery: Partial metric failure is labeled unknown rather than reporting healthy.
- Security/cost: Require admin session; redact internal errors and exact secrets.
- Out of scope: A public status dashboard.
- Unit scenario: GIVEN authorization states, stale thresholds, and internal errors, WHEN health mapping runs, THEN access, status, and redaction are correct.
- Integration scenario: GIVEN real pipeline and queue records, WHEN authenticated and unauthenticated requests hit the endpoint, THEN only the authenticated response contains operational data.
- E2E scenario: GIVEN an admin login and stale fixture run, WHEN the owner opens operational health, THEN the UI visibly reports stale state, queues, moderation, and budget.
- Open questions: None.

Ticket-specific acceptance:

- Owner can see freshness, queues, run state, moderation, and budget.
- Internal details are not exposed by public health.
- Unit, authenticated API integration, and admin-browser E2E tests pass.

### P1-16: Run moderation shadow evaluation

Depends on: P1-12, P1-13, P1-14

OpenSpec change seed: `p1-16-moderation-shadow-evaluation`

- Problem: Auto-approval thresholds need production evidence before they mutate state.
- Required behavior: Collect at least seven successful daily shadow runs, classify proposed decisions, calculate false approvals/holds, and recommend thresholds.
- Interfaces: Evaluation dataset, decision rubric, and signed-off report attached to the ticket.
- Failure/recovery: Failed or incomplete runs do not count toward seven; ambiguous human labels remain documented.
- Security/cost: Evaluation uses stored results and does not rerun paid calls unnecessarily.
- Out of scope: Enabling auto-approval.
- Unit scenario: GIVEN labeled shadow decisions, WHEN evaluation metrics and report validation run, THEN false approvals, holds, and threshold summaries are correct.
- Integration scenario: GIVEN stored decisions and owner labels, WHEN the evaluation report is built, THEN every included decision is traceable to evidence and policy version.
- E2E scenario: GIVEN seven successful fixture daily runs, WHEN evaluation completes, THEN it emits a valid go/no-go recommendation with proposed thresholds.
- Open questions: Define acceptable false-approval tolerance before data review.

Ticket-specific acceptance:

- Proposed decisions are reviewed and classified.
- Threshold adjustments are documented.
- A go/no-go recommendation for Level 1 is produced.
- Unit, report integration, and seven-run evaluation E2E tests pass.

### P1-17: Enable Level 1 topic auto-approval

Depends on: P1-16

OpenSpec change seed: `p1-17-level1-topic-auto-approval`

- Problem: Approved shadow policy decisions should remove routine human gates while preserving reversibility.
- Required behavior: Enable status mutation behind one flag, preserve evidence and policy version, email every mutation, and support immediate disable.
- Interfaces: `AUTO_APPROVE_TOPICS`, policy mutation transaction, audit record.
- Failure/recovery: Any failed condition or transaction leaves the topic pending; rollback disables future mutations without deleting audit history.
- Security/cost: Only server-side worker configuration may enable the flag.
- Out of scope: Automatic question validation.
- Unit scenario: GIVEN enabled and disabled flags plus eligible and ineligible decisions, WHEN mutation is considered, THEN only enabled, fully eligible topics may proceed and rollback disables future changes.
- Integration scenario: GIVEN eligible and ineligible topics, WHEN policy mutation commits, THEN status and audit records update atomically only for eligible topics.
- E2E scenario: GIVEN a production-like candidate set, WHEN an auto-approval slice runs, THEN only the eligible topic becomes visible through normal public filtering and appears in the receipt.
- Open questions: Ticket must link the accepted P1-16 evaluation.

Ticket-specific acceptance:

- Only fully eligible topics are approved.
- Email identifies every automatic mutation.
- One configuration change disables all auto-approval.
- Unit, transactional integration, and publication E2E tests pass.

### P1-18: Production soak and steady-state tuning

Depends on: P1-14

OpenSpec change seed: `p1-18-production-soak-tuning`

- Problem: Configuration is not proven until it survives real backlog and steady-state operation within budget.
- Required behavior: Run a seven-day soak, tune bounded caps without weakening budget guarantees, record freshness/cost/failure metrics, and publish a steady-state configuration.
- Interfaces: Soak report, approved environment values, incident log, operating runbook.
- Failure/recovery: Any unrecovered failure restarts the soak after correction; no manual database mutation may be hidden.
- Security/cost: Total projected and observed run rate remains below USD 50.
- Out of scope: New pipeline features.
- Unit scenario: GIVEN soak metrics and usage totals, WHEN report validation and monthly projection run, THEN freshness, reliability, and cost pass/fail values are correct.
- Integration scenario: GIVEN production run records and the usage ledger, WHEN soak metrics are generated, THEN every reported value is traceable to stored evidence.
- E2E scenario: GIVEN seven consecutive days of scheduled slices, WHEN the soak closes, THEN freshness, recovery, email, and cost targets all pass before Phase 1 is declared steady.
- Open questions: None.

Ticket-specific acceptance:

- Seven days without unrecovered pipeline failure.
- Data freshness is within 48 hours after backlog completion.
- Known monthly run rate remains below USD 50.
- Unit, metrics integration, and seven-day operational E2E evidence satisfy the OpenSpec change.

## 20. Dependency and parallelization plan

```text
P1-00 is the mandatory first ticket and establishes the gate for every later PR.

Lane A: P1-00 -> P1-01 -> P1-02 -> P1-05 -> P1-06 -> P1-07
                           |
                           +-> P1-08 -> P1-09

Lane B: P1-00 -> P1-03 -> P1-04

After runner core:
P1-07 -> P1-10 -> P1-11 -> P1-12

After runner + budget + email:
P1-07 + P1-09 + P1-12 -> P1-13

Production:
P1-04 + P1-07 + P1-09 + P1-13 -> P1-14
P1-14 -> P1-16 -> P1-17 -> P1-18
```

After P1-00 merges, P1-03 starts immediately because the failing Vercel deployment blocks the cloud path. P1-01 can proceed in parallel and P1-02 follows it. Database schema work should remain sequential within Lane A to reduce migration conflicts. Every lane remains subject to the same pre-PR and post-open review gates.

## 21. Rollback plan

Each automation layer must be independently reversible:

- Disable schedule: turn off the GitHub Actions workflow.
- Stop LLM work: set the application LLM ceiling to zero.
- Stop Tavily: unset `TAVILY_API_KEY` or disable the trend stage.
- Stop auto-approval: set `AUTO_APPROVE_TOPICS=false` and `AUTO_VALIDATE_QUESTIONS=false`.
- Stop email: disable notifications without affecting pipeline writes.
- Recover content: public queries continue serving previously approved topics and stored verdicts.
- Recover worker: expire the stale lease and dispatch another slice.
- Recover deploy: redeploy the prior Vercel commit; database migrations must remain backward-compatible for at least one application release when practical.

## 22. Definition of done

Phase 1 is complete when:

1. The public site, API, admin, and hosted PostgreSQL run in the cloud.
2. Scheduled pipeline slices run without a local machine.
3. A backlog can span multiple runners and resume without duplicate domain records.
4. Tavily influences prioritization and provides moderation evidence.
5. The owner receives useful success, pause, moderation, and failure emails.
6. Expensive work stops at the USD 30 application LLM ceiling.
7. Total known monthly cost remains below USD 50 during a seven-day production soak.
8. New eligible content reaches the site within 48 hours in steady state.
9. Topic auto-approval has either passed shadow evaluation and been enabled, or remains explicitly disabled with documented reasons.
10. All automatic moderation decisions are explainable, auditable, and reversible.
11. The implementation test suite and production smoke checks pass.
12. Operational runbooks cover disable, retry, stale lease, budget pause, and rollback.
13. Every Phase 1 ticket maps to a valid OpenSpec change whose requirements contain Given/When/Then unit, integration, and end-to-end scenarios.
14. No Phase 1 PR is created without a successful commit-bound `verify:pr-ready` report.
15. Every Phase 1 PR receives an adversarial review, and every validated issue is fixed before merge.
16. Branch protection prevents merge when tests, specification checks, adversarial review, or review threads are unresolved.

## 23. External service assumptions

Verified while preparing this plan:

- GitHub standard hosted runners are free for public repositories; each hosted job is limited to six hours.
- Tavily's free Researcher plan includes 1,000 credits per month; a basic search consumes one credit.
- Neon provides a permanent free plan with compute, storage, and transfer limits; paid Launch usage has no fixed monthly minimum but is metered.
- Resend's free transactional tier includes 3,000 emails per month and 100 emails per day.

Pricing and limits can change. Recheck them before enabling production billing:

- GitHub Actions limits: https://docs.github.com/en/actions/reference/limits
- GitHub Actions billing: https://docs.github.com/en/billing/concepts/product-billing/github-actions
- Tavily credits: https://docs.tavily.com/documentation/api-credits
- Neon plans: https://neon.com/docs/introduction/plans
- Resend pricing: https://resend.com/pricing
