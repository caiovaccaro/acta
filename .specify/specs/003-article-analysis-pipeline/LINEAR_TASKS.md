# Linear Tasks: Article Analysis Pipeline

**Parent Issue**: Article Analysis & Verdict Pipeline  
**Created**: 2025-01-27

## Task Format for Linear Import

Use this format to create tasks in Linear. Each task includes:
- Title
- Description
- Status (Todo/Done/Backlog)
- Priority (High/Medium/Low)
- Dependencies
- Estimated effort
- Phase

**Import Method**: Use the CSV file `LINEAR_TASKS_IMPORT.csv` for bulk import into Linear CLI.

---

## Phase 1: Foundation (Weeks 1-2)

### Task 1.1: Apply Database Migration
**Title**: Apply database migration for article analysis pipeline  
**Description**: 
- Apply the migration file `20251201154345_add_article_analysis_pipeline/migration.sql`
- Verify all tables created: `topics`, `questions`, `topic_articles`, `article_analyses`, `verdicts`, `evidence_bullets`
- Verify all enums created: `QuestionValidationStatus`, `Stance`, `VerdictLabel`, `EvidenceType`
- Verify all indexes created correctly
- Verify foreign key constraints in place
- Regenerate Prisma client

**Priority**: High  
**Status**: Done  
**Dependencies**: None  
**Effort**: 2-3 hours  
**Labels**: `database`, `migration`, `schema`

---

### Task 1.2: Create Prisma Repositories
**Title**: Create Prisma repositories for new entities  
**Description**:
- Create repository classes for all new entities:
  - `modules/db/src/repositories/topicRepository.ts`
  - `modules/db/src/repositories/questionRepository.ts`
  - `modules/db/src/repositories/articleAnalysisRepository.ts`
  - `modules/db/src/repositories/verdictRepository.ts`
  - `modules/db/src/repositories/evidenceBulletRepository.ts`
  - `modules/db/src/repositories/topicArticleRepository.ts`
- Implement all CRUD operations
- Ensure type-safe with Prisma-generated types
- Write unit tests for each repository
- Implement error handling

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.1  
**Effort**: 8-10 hours  
**Labels**: `database`, `repository`, `typescript`

---

### Task 1.3: Update Article Repository
**Title**: Update Article repository with new relations  
**Description**:
- Add relations to Article model for new entities
- Add methods to find articles by topic
- Add methods to find articles by question
- Ensure relations properly exposed

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.1  
**Effort**: 2-3 hours  
**Labels**: `database`, `repository`, `refactor`

---

### Task 1.4: Design LLM Provider Interface
**Title**: Design LLM provider abstraction interface  
**Description**:
- Create abstract interface for LLM providers
- Create `modules/core/src/llm/provider.ts` (interface)
- Create `modules/core/src/llm/types.ts` (types)
- Ensure interface supports all required operations
- Ensure interface is provider-agnostic
- Ensure types are well-defined
- Complete documentation

**Priority**: High  
**Status**: Done  
**Dependencies**: None  
**Effort**: 4-6 hours  
**Labels**: `llm`, `architecture`, `design`

---

### Task 1.5: Implement OpenAI Provider
**Title**: Implement OpenAI provider  
**Description**:
- Implement OpenAI provider using the abstract interface
- Create `modules/core/src/llm/providers/openaiProvider.ts`
- Ensure implements LLM provider interface
- Support batch processing
- Implement retry logic with exponential backoff
- Handle rate limiting
- Write unit tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.4  
**Effort**: 6-8 hours  
**Labels**: `llm`, `openai`, `implementation`

---

### Task 1.6: Create LLM Configuration System
**Title**: Create LLM configuration system  
**Description**:
- Create configuration system for LLM provider selection
- Create `modules/core/src/llm/config.ts`
- Support provider selection via environment variables
- Implement configuration validation
- Set default provider (OpenAI)

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.4  
**Effort**: 2-3 hours  
**Labels**: `llm`, `configuration`

---

### Task 1.7: Design Validation Framework Architecture
**Title**: Design validation framework architecture  
**Description**:
- Design composable validation framework
- Create `modules/core/src/validation/framework.ts`
- Create `modules/core/src/validation/config.ts`
- Ensure framework supports adding/removing checks
- Make it configuration-driven
- Ensure each check is independently testable
- Complete documentation

**Priority**: High  
**Status**: Done  
**Dependencies**: None  
**Effort**: 4-6 hours  
**Labels**: `validation`, `framework`, `design`

---

### Task 1.8: Implement Default Validation Checks
**Title**: Implement default validation checks (7 checks)  
**Description**:
- Implement the 7 default validation checks:
  - `modules/core/src/validation/checks/publicClarity.ts`
  - `modules/core/src/validation/checks/alignmentWithDebate.ts`
  - `modules/core/src/validation/checks/simplicityWithoutBias.ts`
  - `modules/core/src/validation/checks/anchoringInNews.ts`
  - `modules/core/src/validation/checks/explicitObjective.ts`
  - `modules/core/src/validation/checks/clearBinaryNature.ts`
  - `modules/core/src/validation/checks/answerableWithEvidence.ts`
- Ensure each check returns pass/fail with notes
- Write unit tests for each check
- Write integration tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.7  
**Effort**: 8-10 hours  
**Labels**: `validation`, `checks`, `implementation`

---

## Phase 2: Core Analysis (Weeks 3-4)

### Task 2.1: Implement Topic Matching
**Title**: Implement topic matching  
**Description**:
- Implement proactive topic matching using keyword matching
- Create `modules/core/src/analysis/topicMatcher.ts`
- Implement keyword-based matching
- Ensure only matching articles assigned to topics
- Implement confidence scoring
- Write unit tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 4-5 hours  
**Labels**: `analysis`, `topics`, `matching`

---

### Task 2.2: Create Initial Topics
**Title**: Create initial topics (seed script)  
**Description**:
- Create 3 initial topics from PRD (Gaza, Drug Policy, AI Regulation)
- Create `modules/db/src/scripts/seedTopics.ts`
- Ensure 3 topics created in database
- Make seed script executable
- Document process for adding new topics

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 2-3 hours  
**Labels**: `database`, `seeding`, `topics`

---

### Task 2.3: Implement Question Validation
**Title**: Implement question validation  
**Description**:
- Implement question validation using the framework
- Create `modules/core/src/analysis/questionValidator.ts`
- Validate questions against framework
- Return validation results
- Support reformulation suggestions
- Write unit tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Tasks 1.7, 1.8  
**Effort**: 4-5 hours  
**Labels**: `validation`, `questions`, `analysis`

---

### Task 2.4: Implement Question Matching
**Title**: Implement question matching  
**Description**:
- Implement proactive question matching
- Create `modules/core/src/analysis/questionMatcher.ts`
- Ensure only matching articles analyzed
- Implement confidence scoring
- Write unit tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Tasks 1.2, 2.3  
**Effort**: 3-4 hours  
**Labels**: `analysis`, `questions`, `matching`

---

### Task 2.5: Create Initial Questions
**Title**: Create initial questions (seed script)  
**Description**:
- Create pre-defined questions from PRD and validate them
- Create `modules/db/src/scripts/seedQuestions.ts`
- Ensure questions created and validated
- Ensure all questions pass framework validation
- Make seed script executable

**Priority**: High  
**Status**: Todo  
**Dependencies**: Tasks 2.3, 2.4  
**Effort**: 3-4 hours  
**Labels**: `database`, `seeding`, `questions`

---

### Task 2.6: Implement Stance Classifier
**Title**: Implement stance classifier with monthly tracking  
**Description**:
- Implement LLM-based stance classification with monthly tracking
- Create `modules/core/src/analysis/stanceClassifier.ts`
- Create `modules/core/src/llm/prompts/stanceClassification.ts`
- Classify stance per article-question-month triad
- Return confidence score
- Return reasoning
- Handle monthly period correctly
- Write unit tests
- Write integration tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Tasks 1.5, 1.2  
**Effort**: 8-10 hours  
**Labels**: `llm`, `analysis`, `stance`, `monthly-tracking`

---

### Task 2.7: Implement Monthly Period Logic
**Title**: Implement monthly period logic  
**Description**:
- Implement logic for monthly stance tracking
- Create `modules/core/src/utils/monthPeriod.ts`
- Always use first day of month (YYYY-MM-01)
- Use last month's data as current month
- Create helper functions for month calculations
- Write unit tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 2-3 hours  
**Labels**: `utils`, `monthly-tracking`

---

## Phase 3: Verdict Calculation (Weeks 5-6)

### Task 3.1: Implement Verdict Calculator
**Title**: Implement verdict calculator  
**Description**:
- Implement weighted consensus verdict calculation
- Create `modules/core/src/analysis/verdictCalculator.ts`
- Calculate support share (S)
- Calculate variance
- Determine verdict label
- Calculate confidence
- Use outlet credibility for weighting
- **Note**: Ideology NOT used in calculation (backend-only metadata)
- Filter by month period
- Write unit tests
- Write integration tests

**Priority**: High  
**Status**: ✅ Completed  
**Dependencies**: Tasks 2.6, 1.2  
**Effort**: 8-10 hours  
**Labels**: `analysis`, `verdict`, `consensus`

---

### Task 3.2: Implement Monthly Verdict Calculation
**Title**: Implement monthly verdict calculation  
**Description**:
- Ensure verdicts are calculated per month period
- Update `modules/core/src/analysis/verdictCalculator.ts`
- Calculate verdicts per month
- Preserve historical verdicts
- Use efficient queries with composite index `(questionId, month)`
- Composite unique constraint `@@unique([questionId, month])`
- Write unit tests

**Priority**: High  
**Status**: ✅ Completed  
**Dependencies**: Tasks 3.1, 2.7  
**Effort**: 3-4 hours  
**Labels**: `analysis`, `verdict`, `monthly-tracking`

---

### Task 3.3: Implement Verdict Reasoning (LLM Summarization)
**Title**: Implement verdict reasoning generation  
**Description**:
- Generate LLM-based reasoning summaries for verdicts
- Add `summarizeVerdict` method to LLM provider
- Store reasoning in `verdict.reasoning` field
- Handle zero-article verdicts (no hallucination)
- Create script to generate reasoning for all verdicts
- Create comprehensive logging script with statistics

**Priority**: High  
**Status**: ✅ Completed  
**Dependencies**: Tasks 3.1, 3.2  
**Effort**: 4-5 hours  
**Labels**: `analysis`, `verdict`, `llm`, `reasoning`

---

## Phase 4: Batch Processing & Queue (Weeks 7-8)

### Task 4.1: Design Queue System
**Title**: Design queue system  
**Description**:
- Design database-backed queue system
- Create `modules/core/src/queue/queue.ts`
- Create `modules/core/src/queue/types.ts`
- Document queue design
- Support priority
- Support batch processing
- Define error handling strategy

**Priority**: High  
**Status**: Todo  
**Dependencies**: None  
**Effort**: 3-4 hours  
**Labels**: `queue`, `design`, `architecture`

---

### Task 4.2: Implement Queue System
**Title**: Implement queue system  
**Description**:
- Implement database-backed queue
- Create `modules/core/src/queue/queue.ts`
- Implement enqueue/dequeue operations
- Support priority
- Support batch processing
- Implement retry logic
- Write unit tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.1  
**Effort**: 6-8 hours  
**Labels**: `queue`, `implementation`

---

### Task 4.3: Implement Batch Processing Job
**Title**: Implement batch processing job  
**Description**:
- Implement batch processing job for article analysis
- Create `apps/api/src/jobs/analysisPipeline.ts`
- Process articles in batches
- Handle errors gracefully
- Log progress
- Support configurable batch size
- Write integration tests

**Priority**: High  
**Status**: Todo  
**Dependencies**: Tasks 4.2, 2.6, 3.1  
**Effort**: 6-8 hours  
**Labels**: `batch-processing`, `jobs`, `pipeline`

---

## Phase 5: Evidence Extraction (Deferred)

### Task 5.1: Design Evidence Extraction
**Title**: Design evidence extraction (deferred)  
**Description**:
- Design evidence extraction system
- Deferred to later phase

**Priority**: Low  
**Status**: Backlog  
**Dependencies**: Phase 3 complete  
**Effort**: TBD  
**Labels**: `evidence`, `design`, `deferred`

---

### Task 5.2: Implement Evidence Extraction
**Title**: Implement evidence extraction (deferred)  
**Description**:
- Implement evidence bullet extraction
- Deferred to later phase

**Priority**: Low  
**Status**: Backlog  
**Dependencies**: Task 5.1  
**Effort**: TBD  
**Labels**: `evidence`, `implementation`, `deferred`

---

## Testing & Quality Assurance

### Task 6.1: Unit Tests for Repositories
**Title**: Write unit tests for repositories  
**Description**:
- Write comprehensive unit tests for all repositories
- Test all repository methods
- Cover edge cases
- Mock database interactions

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 6-8 hours  
**Labels**: `testing`, `unit-tests`, `repositories`

---

### Task 6.2: Unit Tests for Analysis Logic
**Title**: Write unit tests for analysis logic  
**Description**:
- Write unit tests for analysis functions
- Test all analysis functions
- Cover edge cases
- Mock LLM responses

**Priority**: High  
**Status**: Todo  
**Dependencies**: Phase 2, Phase 3  
**Effort**: 8-10 hours  
**Labels**: `testing`, `unit-tests`, `analysis`

---

### Task 6.3: Integration Tests for Pipeline
**Title**: Write integration tests for pipeline  
**Description**:
- Write integration tests for full pipeline
- Test end-to-end pipeline
- Test database interactions
- Test LLM provider switching

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Phase 4  
**Effort**: 6-8 hours  
**Labels**: `testing`, `integration-tests`, `pipeline`

---

## Documentation

### Task 7.1: API Documentation
**Title**: Document API endpoints and types  
**Description**:
- Document all API endpoints and types
- Document all endpoints
- Include request/response examples
- Document error handling

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Implementation complete  
**Effort**: 4-6 hours  
**Labels**: `documentation`, `api`

---

### Task 7.2: Developer Guide
**Title**: Create developer guide  
**Description**:
- Create developer guide for extending the system
- Document how to add new LLM provider
- Document how to add new validation check
- Document how to add new topic/question
- Provide architecture overview

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Implementation complete  
**Effort**: 4-6 hours  
**Labels**: `documentation`, `developer-guide`

---

## Summary

**Total Tasks**: 25 tasks  
**Total Estimated Effort**: ~120-150 hours  
**Timeline**: 8 weeks (2 months) for MVP

**Phases**:
- Phase 1: Foundation (8 tasks, ~40-50 hours)
- Phase 2: Core Analysis (7 tasks, ~30-40 hours)
- Phase 3: Verdict Calculation (2 tasks, ~11-14 hours)
- Phase 4: Batch Processing (3 tasks, ~15-20 hours)
- Phase 5: Evidence Extraction (2 tasks, deferred)
- Testing (3 tasks, ~20-26 hours)
- Documentation (2 tasks, ~8-12 hours)

## Import Instructions

1. **CSV Import** (Recommended):
   - Use `LINEAR_TASKS_IMPORT.csv` with Linear CLI
   - Command: `linear import csv LINEAR_TASKS_IMPORT.csv`

2. **Manual Import**:
   - Use `LINEAR_TASKS.md` as reference
   - Create tasks manually in Linear
   - Link to parent issue: "Article Analysis & Verdict Pipeline"

## Dependencies

Critical path dependencies:
- Task 1.1 → Task 1.2 → Task 1.3
- Task 1.4 → Task 1.5 → Task 2.6
- Task 1.7 → Task 1.8 → Task 2.3 → Task 2.4 → Task 2.5
- Task 2.6 → Task 3.1 → Task 3.2
- Task 4.1 → Task 4.2 → Task 4.3

