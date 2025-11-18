# Feature Specification: Article Analysis & Verdict Pipeline

**Feature Branch**: `003-article-analysis-pipeline`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: Research documents and decision matrix for implementing article content analysis, question extraction, stance classification, and consensus verdict generation

## Overview

This specification defines the implementation of the article analysis pipeline that processes crawled articles to extract questions, classify stances, and generate consensus verdicts. The system analyzes articles about topics, extracts the main ideological questions being debated, classifies each article's stance on those questions, and calculates weighted consensus verdicts.

## Key Decisions Made

### Technology Stack
- **LLM Provider**: OpenAI
- **Model**: GPT-4 Turbo (or latest available GPT-4 model - note: GPT-5 not yet released as of 2025-01-27)
- **Model Selection**: Use latest GPT-4 variant available at implementation time
- **Processing**: Batch processing with queue system
- **Budget**: ~$200-300/month acceptable for accuracy
- **Database**: Normalized schema with materialized views and indexes
- **Caching**: Smart caching strategy (questions, stance classifications where appropriate)
- **Error Handling**: Retry with exponential backoff (DLQ in future phase)

### Implementation Approach
- **Topics**: Pre-defined topics (3 from PRD) with **proactive matching** - articles are matched to topics, only matching articles are processed
- **Questions**: Pre-defined questions with LLM validation, **proactive matching** - only articles matching questions are analyzed
- **Future (Automatic)**: **Reactive detection** - all topics/questions detected from articles, can be moderated/approved later
- **Ideology**: Backend-only (tied to outlets/sources) - Used for internal weighting calculations, **NEVER exposed in UI**
- **Stance Classification**: LLM-based (embeddings comparison to be evaluated later)
- **Answer Synthesis**: Argument extraction + aggregation (RAG in future phase)
- **Quality Assurance**: Confidence thresholds + sample human review

## User Scenarios & Testing

### User Story 1 - Proactive Article Matching to Topics and Questions (Priority: P1)

The system proactively matches articles to pre-defined topics and questions, only processing articles that match the defined set.

**Why this priority**: Proactive matching ensures we only analyze relevant articles for our pre-defined topics/questions, avoiding wasted processing and maintaining focus on the PRD topics.

**Independent Test**: Can be tested by providing articles and pre-defined topics/questions, verifying that only matching articles are assigned and processed.

**Acceptance Scenarios**:

1. **Given** articles arrive from the crawler, **When** topic matching runs, **Then** articles are matched to pre-defined topics using keyword matching, and only matching articles are assigned to topics.

2. **Given** articles are assigned to a topic, **When** question matching runs, **Then** articles are matched to pre-defined questions for that topic, and only matching articles are analyzed for stance.

3. **Given** an article doesn't match any pre-defined topic, **When** topic matching runs, **Then** the article is not assigned to any topic and is not processed further.

4. **Given** an article matches a topic but doesn't match any questions, **When** question matching runs, **Then** the article is not analyzed for stance (no ArticleAnalysis created).

5. **Given** pre-defined questions exist, **When** question validation runs, **Then** the system validates questions against actual article content using LLM to ensure relevance.

6. **Given** question validation fails or question is irrelevant, **When** validation completes, **Then** the system flags the question for review but still allows matching articles to be processed.

---

### User Story 2 - Question Validation & Polishing (Priority: P1)

The system validates and polishes questions against the formulation framework before they can be used for analysis.

**Why this priority**: Questions are the foundation of verdicts. Ensuring questions meet the framework (clear, neutral, binary, evidence-based) is critical for reliable verdicts and user trust.

**Independent Test**: Can be tested by submitting questions (both valid and invalid) and verifying validation results and reformulation suggestions.

**Acceptance Scenarios**:

1. **Given** an editor submits a question, **When** validation runs, **Then** the system evaluates it against all 7 framework checks (Public Clarity, Alignment with Real Debate, Simplicity Without Bias, Anchoring in Current News, Explicit Objective, Clear Binary Nature, Answerable with Evidence).

2. **Given** a question fails one or more framework checks, **When** validation completes, **Then** the system generates reformulated versions that address the failures using LLM.

3. **Given** reformulated questions are generated, **When** they are presented, **Then** the editor can see the original vs. proposed versions with explanations of improvements.

4. **Given** a question passes all framework checks, **When** validation completes, **Then** the question is marked as validated and can be activated for article matching.

5. **Given** an automatically extracted question (future), **When** extraction completes, **Then** it goes through the same validation and polishing workflow before moderation.

6. **Given** a question is submitted with bias or unclear language, **When** polishing runs, **Then** the system reformulates it to follow the "Is X the most effective way to achieve Y?" format when applicable.

---

### User Story 3 - Stance Classification per Question (Priority: P1)

For each extracted question, the system analyzes all related articles to determine each article's stance (Yes/Leaning Yes/Neutral/Leaning No/No) on that specific question.

**Why this priority**: Stance classification is required to calculate consensus verdicts. Without knowing how each article positions itself on a question, we cannot aggregate to a verdict.

**Independent Test**: Can be tested by providing a question and a set of articles, verifying that each article receives a stance classification with confidence score.

**Acceptance Scenarios**:

1. **Given** a question exists with related articles, **When** stance classification runs, **Then** each article receives a stance classification (Yes/Leaning Yes/Neutral/Leaning No/No) stored in `ArticleAnalysis`.

2. **Given** an article's stance classification confidence is below threshold (e.g., < 0.7), **When** classification completes, **Then** the result is flagged for review and stored with low confidence.

3. **Given** stance classification fails for an article, **When** the job encounters an error, **Then** the system retries with exponential backoff and logs failures for investigation.

4. **Given** an article is analyzed for multiple questions, **When** classification runs, **Then** each article-question pair receives its own stance classification.

---

### User Story 4 - Consensus Verdict Calculation (Priority: P1)

The system aggregates all article stances for a question to calculate a weighted consensus verdict (Yes/Leaning Yes/Split/Leaning No/No) with confidence score.

**Why this priority**: Verdicts are the core output of the system. Users need to see the consensus position on questions to make informed decisions.

**Independent Test**: Can be tested by providing a question with article analyses and verifying that a verdict is calculated according to the PRD formula (support share, variance, etc.).

**Acceptance Scenarios**:

1. **Given** a question has at least 6 article analyses from at least 2 different outlets, **When** verdict calculation runs, **Then** a verdict is calculated and stored in the `Verdict` table.

2. **Given** a question has insufficient data (fewer than 6 articles or only 1 outlet), **When** verdict calculation runs, **Then** the verdict is set to "Split" with "Low" confidence and a note about insufficient data.

3. **Given** outlets have different credibility scores, **When** verdict calculation runs, **Then** articles are weighted by outlet credibility in the consensus calculation.

4. **Given** a verdict is calculated, **When** the calculation completes, **Then** support share (S) and variance are stored for transparency.

---

### User Story 5 - Evidence Extraction (Priority: P2)

The system extracts evidence bullets (Why, Dissent, Unknowns) from articles to support the verdict.

**Why this priority**: Evidence bullets provide transparency and help users understand the basis for verdicts. Important for trust but not required for basic functionality.

**Independent Test**: Can be tested independently by providing a verdict and articles, verifying that evidence bullets are extracted and stored.

**Acceptance Scenarios**:

1. **Given** a verdict exists with supporting articles, **When** evidence extraction runs, **Then** 3 "Why" bullets are extracted from articles with Yes/Leaning Yes stances.

2. **Given** a verdict exists with opposing articles, **When** evidence extraction runs, **Then** 1 "Dissent" bullet is extracted from articles with No/Leaning No stances.

3. **Given** evidence extraction runs, **When** bullets are generated, **Then** each bullet includes a citation to the source article.

4. **Given** evidence extraction runs, **When** bullets are generated, **Then** "Unknowns" bullet identifies what's still unclear or missing.

---

### User Story 6 - Batch Processing with Queue (Priority: P2)

The system processes articles in batches using a queue system to optimize costs and handle large volumes.

**Why this priority**: Batch processing is essential for cost optimization and scalability. Queue system ensures reliability and allows prioritization.

**Independent Test**: Can be tested by enqueueing articles for processing and verifying they are processed in batches with proper error handling.

**Acceptance Scenarios**:

1. **Given** new articles arrive, **When** they are enqueued, **Then** they are added to a processing queue for batch analysis.

2. **Given** articles are in the queue, **When** batch processing runs, **Then** articles are processed in configurable batch sizes (e.g., 10-50 articles per batch).

3. **Given** batch processing encounters an error, **When** an article fails, **Then** it is retried with exponential backoff and logged for investigation.

4. **Given** batch processing completes, **When** all articles are processed, **Then** the queue is cleared and results are stored.

---

## Requirements

### Functional Requirements

#### FR-001: Topic Management
- **FR-001.1**: System MUST support pre-defined topics (initially 3 from PRD: Gaza, Drug Policy, AI Regulation)
- **FR-001.2**: System MUST allow manual topic creation via admin interface
- **FR-001.3**: System MUST **proactively match** articles to pre-defined topics using keyword matching (MVP)
- **FR-001.4**: System MUST only process articles that match pre-defined topics (filtering approach)
- **FR-001.5**: System MUST store topics in `Topic` table with name, description, safety_note_required
- **FR-001.6**: System MUST support path to **reactive automatic topic discovery** (future phase) - detect all topics from articles, allow moderation/approval

#### FR-002: Question Extraction & Validation
- **FR-002.1**: System MUST support pre-defined questions from PRD with LLM validation against article content
- **FR-002.2**: System MUST **proactively match** articles to pre-defined questions (only analyze articles that match)
- **FR-002.3**: System MUST store questions in `Question` table linked to `Topic`
- **FR-002.4**: System MUST support multiple questions per topic
- **FR-002.5**: System MUST store question metadata: extracted_at, confidence, source_articles_count, validation_status
- **FR-002.6**: System MUST validate questions against the formulation framework (7 checks: Public Clarity, Alignment with Real Debate, Simplicity Without Bias, Anchoring in Current News, Explicit Objective, Clear Binary Nature, Answerable with Evidence)
- **FR-002.7**: System MUST provide LLM-based question reformulation/polishing to improve questions that don't meet the framework
- **FR-002.8**: System MUST allow manual question submission that goes through validation and polishing workflow
- **FR-002.9**: System MUST only activate questions that pass all framework validation checks
- **FR-002.10**: System MUST provide path to **reactive automatic question extraction** (future phase) - detect all questions from articles, validate against framework, allow moderation/approval
- **FR-002.11**: System MUST only process articles that match pre-defined questions (filtering approach for MVP)

#### FR-003: Stance Classification
- **FR-003.1**: System MUST classify article stance on questions using LLM (GPT-4 Turbo)
- **FR-003.2**: System MUST classify stance per article-question pair (not per-article)
- **FR-003.3**: System MUST support stance values: Yes, Leaning Yes, Neutral, Leaning No, No
- **FR-003.4**: System MUST store stance in `ArticleAnalysis` table with confidence score (0-1)
- **FR-003.5**: System MUST store reasoning for stance classification
- **FR-003.6**: System MUST flag low-confidence classifications (< threshold) for review
- **FR-003.7**: System MUST support evaluation of embeddings-based classification (future comparison)

#### FR-004: Consensus Verdict Calculation
- **FR-004.1**: System MUST calculate verdicts per question (not per topic)
- **FR-004.2**: System MUST aggregate all article stances for a question
- **FR-004.3**: System MUST weight articles by outlet credibility (0-1 scale)
- **FR-004.4**: System MUST calculate support share (S) from weighted stances
- **FR-004.5**: System MUST calculate variance (ideological dispersion) across outlets
- **FR-004.6**: System MUST determine verdict label using PRD rules:
  - Yes: S ≥ 0.67, low variance
  - Leaning Yes: S 0.55-0.67 or moderate variance
  - Split: S 0.45-0.55 or high variance
  - Leaning No: S 0.33-0.45
  - No: S ≤ 0.33
- **FR-004.7**: System MUST calculate confidence: distance from 0.5 × (1 - variance)
- **FR-004.8**: System MUST store verdict in `Verdict` table linked to `Question`

#### FR-005: Evidence Extraction
- **FR-005.1**: System MUST extract 3 "Why" bullets from articles with Yes/Leaning Yes stances
- **FR-005.2**: System MUST extract 1 "Dissent" bullet from articles with No/Leaning No stances
- **FR-005.3**: System MUST extract 1 "Unknowns" bullet identifying missing facts
- **FR-005.4**: System MUST store evidence in `EvidenceBullet` table with citations
- **FR-005.5**: System MUST use argument extraction + aggregation method (MVP)
- **FR-005.6**: System MUST support path to RAG-based synthesis (future phase)

#### FR-006: Batch Processing
- **FR-006.1**: System MUST process articles in batches (configurable size: 10-50 articles)
- **FR-006.2**: System MUST use queue system for article processing
- **FR-006.3**: System MUST support priority queue for important articles
- **FR-006.4**: System MUST process batches asynchronously
- **FR-006.5**: System MUST support batch API calls to OpenAI for cost optimization

#### FR-007: Error Handling & Retry
- **FR-007.1**: System MUST retry failed LLM API calls with exponential backoff
- **FR-007.2**: System MUST log all failures for investigation
- **FR-007.3**: System MUST support maximum retry attempts (e.g., 3 attempts)
- **FR-007.4**: System MUST provide path to Dead Letter Queue (DLQ) implementation (future phase)

#### FR-008: Quality Assurance
- **FR-008.1**: System MUST apply confidence thresholds to all LLM outputs
- **FR-008.2**: System MUST flag low-confidence results for human review
- **FR-008.3**: System MUST support sample-based human review workflow
- **FR-008.4**: System MUST track review status and outcomes

#### FR-009: Caching
- **FR-009.1**: System MUST cache question extraction results (questions don't change often)
- **FR-009.2**: System MUST NOT cache verdicts (need recalculation with new articles)
- **FR-009.3**: System MUST implement cache invalidation for updated data
- **FR-009.4**: System MUST use smart caching strategy (cache what makes sense)

#### FR-010: Database Design
- **FR-010.1**: System MUST use normalized database schema
- **FR-010.2**: System MUST create materialized views for read-heavy queries
- **FR-010.3**: System MUST add appropriate indexes for performance
- **FR-010.4**: System MUST use outlet ideology (from existing Outlet model) for internal weighting calculations
- **FR-010.5**: System MUST infer article ideology from outlet ideology (backend-only, not stored in ArticleAnalysis)
- **FR-010.6**: System MUST NEVER expose ideology data in API responses or UI

### Non-Functional Requirements

#### NFR-001: Performance
- **NFR-001.1**: Question extraction MUST complete within 30 seconds per topic (10-50 articles)
- **NFR-001.2**: Stance classification MUST process at least 10 articles per minute
- **NFR-001.3**: Verdict calculation MUST complete within 5 seconds per question
- **NFR-001.4**: Batch processing MUST handle at least 100 articles per hour

#### NFR-002: Cost
- **NFR-002.1**: System MUST stay within budget of $200-300/month for LLM API calls
- **NFR-002.2**: System MUST use batch API when possible (50% cost reduction)
- **NFR-002.3**: System MUST optimize prompts to reduce token usage
- **NFR-002.4**: System MUST cache results to avoid redundant API calls

#### NFR-003: Reliability
- **NFR-003.1**: System MUST achieve 99% success rate for stance classification
- **NFR-003.2**: System MUST handle API rate limits gracefully
- **NFR-003.3**: System MUST recover from transient failures automatically
- **NFR-003.4**: System MUST log all errors for monitoring

#### NFR-004: Accuracy
- **NFR-004.1**: Stance classification MUST achieve at least 85% accuracy (validated against sample)
- **NFR-004.2**: Question extraction MUST produce relevant questions (validated by human review)
- **NFR-004.3**: Verdict calculation MUST match manual calculation (100% accuracy)

## Key Entities

### Topic
Represents a broad theme or subject matter (e.g., "Gaza", "Drug Policy", "AI Regulation").

**Fields:**
- `id` (UUID, primary key)
- `name` (string, unique)
- `description` (text, nullable)
- `safetyNoteRequired` (boolean, default: false)
- `createdAt`, `updatedAt` (timestamps)

**Relations:**
- Has many `Question`
- Has many `TopicArticle` (many-to-many with `Article`)

### Question
Represents the specific ideological question extracted from articles about a topic.

**Fields:**
- `id` (UUID, primary key)
- `topicId` (foreign key to Topic)
- `questionText` (text) - e.g., "Is what's happening in Gaza a genocide?"
- `originalQuestionText` (text, nullable) - Original text before reformulation (if polished)
- `extractedAt` (datetime)
- `confidence` (float, nullable) - LLM confidence in extraction
- `sourceArticlesCount` (integer) - Number of articles used
- `validationStatus` (enum: pending, validated, rejected, needs_reformulation) - Framework validation status
- `validationResults` (JSON, nullable) - Results of 7 framework checks with pass/fail and notes
- `isActive` (boolean, default: false) - Only true if validationStatus = 'validated'
- `createdAt`, `updatedAt` (timestamps)

**Relations:**
- Belongs to `Topic`
- Has many `ArticleAnalysis`
- Has one `Verdict`
- Has many `EvidenceBullet`

### ArticleAnalysis
Stores per-article stance on a specific question.

**Fields:**
- `id` (UUID, primary key)
- `articleId` (foreign key to Article)
- `questionId` (foreign key to Question)
- `stance` (enum: Yes, LeaningYes, Neutral, LeaningNo, No)
- `confidence` (float, 0-1) - LLM confidence
- `reasoning` (text, nullable) - LLM reasoning
- `analyzedAt` (datetime)
- `createdAt`, `updatedAt` (timestamps)

**Note**: Ideology is NOT stored in ArticleAnalysis. Article ideology is inferred from outlet ideology (Outlet.ideology) for internal calculations only. Ideology is NEVER exposed in API responses or UI.

**Relations:**
- Belongs to `Article`
- Belongs to `Question`

**Constraints:**
- Unique constraint on `(articleId, questionId)` - one analysis per article-question pair

### Verdict
Stores consensus stance on a question, calculated from all article analyses.

**Fields:**
- `id` (UUID, primary key)
- `questionId` (foreign key to Question, unique)
- `verdictLabel` (enum: Yes, LeaningYes, Split, LeaningNo, No)
- `confidence` (float, 0-100)
- `supportShare` (float, 0-1) - Aggregate support (S)
- `variance` (float, 0-1) - Ideological dispersion
- `calculatedAt` (datetime)
- `createdAt`, `updatedAt` (timestamps)

**Relations:**
- Belongs to `Question`
- Has many `EvidenceBullet`

### EvidenceBullet
Stores evidence supporting a verdict.

**Fields:**
- `id` (UUID, primary key)
- `verdictId` (foreign key to Verdict)
- `text` (text)
- `articleId` (foreign key to Article, nullable)
- `type` (enum: Why, Dissent, Unknown)
- `order` (integer) - For ordering bullets
- `createdAt`, `updatedAt` (timestamps)

**Relations:**
- Belongs to `Verdict`
- Belongs to `Article` (optional)

### TopicArticle (Join Table)
Links articles to topics (many-to-many).

**Fields:**
- `id` (UUID, primary key)
- `topicId` (foreign key to Topic)
- `articleId` (foreign key to Article)
- `assignedAt` (datetime)
- `confidence` (float, nullable) - Confidence in assignment

**Relations:**
- Belongs to `Topic`
- Belongs to `Article`

**Constraints:**
- Unique constraint on `(topicId, articleId)`

## Success Criteria

### Measurable Outcomes

- **SC-001**: System can extract questions from topic articles with 90% relevance (validated by human review)
- **SC-002**: System can classify article stances with 85% accuracy (validated against sample)
- **SC-003**: System can calculate verdicts that match manual calculations (100% accuracy)
- **SC-004**: System processes at least 100 articles per hour in batch mode
- **SC-005**: System stays within $200-300/month budget for LLM API calls
- **SC-006**: System achieves 99% success rate for stance classification (after retries)
- **SC-007**: System extracts evidence bullets with citations for 100% of verdicts
- **SC-008**: System flags low-confidence results (< 0.7) for 100% of classifications

## Technical Architecture

### LLM Integration
- **Provider**: OpenAI
- **Model**: GPT-4 Turbo (or latest GPT-4 variant - evaluate GPT-5 if available at implementation)
- **Model Selection Rationale**: Use latest stable GPT-4 model for reliability; evaluate GPT-5 when released
- **API**: OpenAI API with batch processing support
- **Rate Limiting**: Implement exponential backoff
- **Cost Optimization**: Use batch API, optimize prompts, cache results

### Processing Pipeline

#### MVP: Proactive Matching (Current)
1. **Question Creation & Validation**:
   - Editor submits question manually OR system extracts from articles (future)
   - Question validated against formulation framework (7 checks)
   - If validation fails, LLM generates reformulated versions
   - Editor reviews and approves reformulated question
   - Question marked as validated and activated
2. **Article Ingestion**: Articles arrive from crawler → stored in `Article` table
3. **Proactive Topic Matching**: Articles matched to pre-defined topics using keyword matching → only matching articles assigned to topics
4. **Proactive Question Matching**: Articles matched to validated questions → only matching articles analyzed
5. **Stance Classification**: For each question, analyze only matching articles → classify stance → store in `ArticleAnalysis` table
6. **Verdict Calculation**: 
   - Aggregate all stances for question
   - Infer article ideology from `article.outlet.ideology` (backend-only, not stored)
   - Weight by outlet credibility and normalize by ideology buckets (Left/Center/Right)
   - Calculate verdict → store in `Verdict` table
   - **Note**: Ideology used internally only, NEVER in API/UI
7. **Evidence Extraction**: Extract evidence bullets → store in `EvidenceBullet` table

#### Future: Reactive Detection (Automatic)
1. **Article Ingestion**: Articles arrive from crawler → stored in `Article` table
2. **Reactive Topic Detection**: All topics detected from articles using clustering/LLM → stored for moderation
3. **Topic Moderation**: Detected topics reviewed and approved/rejected
4. **Reactive Question Detection**: All questions detected from articles about approved topics → stored for moderation
5. **Question Validation**: Detected questions automatically validated against formulation framework → reformulated if needed
6. **Question Moderation**: Detected and validated questions reviewed and approved/rejected by editor
7. **Stance Classification**: For approved questions, analyze all matching articles
8. **Verdict Calculation**: Aggregate stances for approved questions
9. **Evidence Extraction**: Extract evidence bullets

### Queue System
- **Queue Type**: Database-backed queue (PostgreSQL)
- **Batch Size**: Configurable (10-50 articles per batch)
- **Priority**: Support priority queue for important articles
- **Retry**: Exponential backoff (3 attempts max)
- **Future**: Dead Letter Queue (DLQ) for failed items

### Database Design
- **Schema**: Normalized with proper foreign keys
- **Views**: Materialized views for read-heavy queries (verdicts, evidence)
- **Indexes**: 
  - `questions.topicId`
  - `article_analyses.questionId`
  - `article_analyses.articleId`
  - `article_analyses.stance`
  - `verdicts.questionId`
  - `evidence_bullets.verdictId`

### Caching Strategy
- **Cache**: Question extraction results (questions don't change often)
- **Cache**: Stance classifications for stable questions (if question doesn't change, article stance likely same)
- **Don't Cache**: Verdicts (need recalculation with new articles)
- **Don't Cache**: Evidence bullets (depend on current articles)
- **Invalidation**: Cache invalidation on data updates (new articles, question changes)

## Future Enhancements

### Phase 2: Reactive Automatic Discovery
- **Reactive Topic Detection**: Detect all topics from articles using clustering/LLM
- **Topic Moderation**: Admin interface to review, approve, or reject detected topics
- **Reactive Question Detection**: Detect all questions from articles about approved topics
- **Question Moderation**: Admin interface to review, approve, or reject detected questions
- **Moderation Workflow**: Support for bulk approval/rejection, editing detected topics/questions
- **Embeddings-based Classification**: Comparison with LLM-based classification for speed/accuracy trade-offs

### Phase 3: Advanced Features
- RAG-based answer synthesis
- Dead Letter Queue (DLQ) implementation
- Fine-tuned models for stance classification
- Real-time processing for priority articles

## Edge Cases

- **No Topic Match**: If article doesn't match any pre-defined topic, skip processing (not assigned)
- **No Question Match**: If article matches topic but not any questions, skip stance analysis
- **Insufficient Matching Articles**: If question has < 6 matching articles, verdict set to "Split" with "Low" confidence
- **No Stance**: If article doesn't address question, classify as "Neutral"
- **API Failures**: Retry with backoff, fallback to pre-defined questions if available
- **Low Confidence**: Flag for review, store with low confidence
- **Multiple Questions**: Support multiple questions per topic (article can match multiple)
- **Question Evolution**: Allow question updates as debates evolve (future: reactive detection handles this)
- **Future - Detected Topics/Questions**: In reactive mode, detected items pending moderation are not used until approved

## Dependencies

- **Database**: PostgreSQL with pgvector (already in use)
- **LLM**: OpenAI API access and API key
- **Queue**: Database-backed queue system
- **Crawler**: Articles must be crawled and stored first

## Data Model Notes

**Important**: 
- **Outlet Ideology**: The existing `Outlet` model has an `ideology` field (Left/Center/Right). This is used for:
  - Internal weighting calculations in consensus computation
  - Normalizing weights across ideology buckets
  - Backend-only calculations
- **Article Ideology**: Article ideology is **inferred** from outlet ideology (not stored). When calculating consensus, articles inherit their outlet's ideology for weighting purposes.
- **ArticleAnalysis**: Does NOT store ideology field. Ideology is inferred from `article.outlet.ideology` when needed for calculations.
- **UI/API Exposure**: Ideology data is **NEVER** exposed in API responses or UI. It is backend-only for internal calculations.

The consensus calculation uses outlet credibility scores and outlet-level ideology for weighting, but ideology is never displayed or exposed to users.

## Related Specifications

- `001-verdict-card`: Verdict Card feature specification
- `002-crawler-postgres-integration`: Crawler database integration
- Research documents: `documentation/research/article-analysis-pipeline.md`, `DECISION_MATRIX.md`, `DATA_MODEL.md`

