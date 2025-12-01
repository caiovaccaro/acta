# Implementation Tasks: Article Analysis Pipeline

**Feature**: Article Analysis & Verdict Pipeline  
**Date**: 2025-01-27  
**Status**: Planning Phase

## Overview

This document breaks down the implementation of the Article Analysis Pipeline into actionable tasks. Tasks are organized by phase and priority, with dependencies clearly marked.

## Task Categories

- **P0**: Critical path, blocks other work
- **P1**: High priority, should be done early
- **P2**: Medium priority, can be done in parallel
- **P3**: Low priority, can be deferred

## Phase 1: Foundation (Weeks 1-2)

### Database Schema & Migrations

#### Task 1.1: Apply Database Migration
- **Priority**: P0
- **Status**: ✅ Migration file created
- **Description**: Apply the migration file `20251201154345_add_article_analysis_pipeline/migration.sql`
- **Dependencies**: None
- **Acceptance Criteria**:
  - [ ] Migration runs successfully on development database
  - [ ] All tables created: `topics`, `questions`, `topic_articles`, `article_analyses`, `verdicts`, `evidence_bullets`
  - [ ] All enums created: `QuestionValidationStatus`, `Stance`, `VerdictLabel`, `EvidenceType`
  - [ ] All indexes created correctly
  - [ ] Foreign key constraints in place
  - [ ] Prisma client regenerated

#### Task 1.2: Create Prisma Repositories
- **Priority**: P0
- **Status**: Not Started
- **Description**: Create repository classes for all new entities
- **Dependencies**: Task 1.1
- **Files to Create**:
  - `modules/db/src/repositories/topicRepository.ts`
  - `modules/db/src/repositories/questionRepository.ts`
  - `modules/db/src/repositories/articleAnalysisRepository.ts`
  - `modules/db/src/repositories/verdictRepository.ts`
  - `modules/db/src/repositories/evidenceBulletRepository.ts`
  - `modules/db/src/repositories/topicArticleRepository.ts`
- **Acceptance Criteria**:
  - [ ] All CRUD operations implemented
  - [ ] Type-safe with Prisma-generated types
  - [ ] Unit tests for each repository
  - [ ] Error handling implemented

#### Task 1.3: Update Article Repository
- **Priority**: P1
- **Status**: Not Started
- **Description**: Add relations to Article model for new entities
- **Dependencies**: Task 1.1
- **Files to Update**:
  - `modules/db/src/repositories/articleRepository.ts`
- **Acceptance Criteria**:
  - [ ] Methods to find articles by topic
  - [ ] Methods to find articles by question
  - [ ] Relations properly exposed

### LLM Provider Abstraction

#### Task 1.4: Design LLM Provider Interface
- **Priority**: P0
- **Status**: ✅ Design document created
- **Description**: Create abstract interface for LLM providers
- **Dependencies**: None
- **Files to Create**:
  - `modules/core/src/llm/provider.ts` (interface)
  - `modules/core/src/llm/types.ts` (types)
- **Acceptance Criteria**:
  - [ ] Interface supports all required operations
  - [ ] Interface is provider-agnostic
  - [ ] Types are well-defined
  - [ ] Documentation complete

#### Task 1.5: Implement OpenAI Provider
- **Priority**: P0
- **Status**: Not Started
- **Description**: Implement OpenAI provider using the abstract interface
- **Dependencies**: Task 1.4
- **Files to Create**:
  - `modules/core/src/llm/providers/openaiProvider.ts`
- **Acceptance Criteria**:
  - [ ] Implements LLM provider interface
  - [ ] Supports batch processing
  - [ ] Retry logic with exponential backoff
  - [ ] Rate limiting handled
  - [ ] Unit tests

#### Task 1.6: Create LLM Configuration System
- **Priority**: P1
- **Status**: Not Started
- **Description**: Create configuration system for LLM provider selection
- **Dependencies**: Task 1.4
- **Files to Create**:
  - `modules/core/src/llm/config.ts`
- **Acceptance Criteria**:
  - [ ] Provider selection via environment variables
  - [ ] Configuration validation
  - [ ] Default provider (OpenAI)

### Validation Framework

#### Task 1.7: Design Validation Framework Architecture
- **Priority**: P0
- **Status**: ✅ Design document created
- **Description**: Design composable validation framework
- **Dependencies**: None
- **Files to Create**:
  - `modules/core/src/validation/framework.ts`
  - `modules/core/src/validation/config.ts`
- **Acceptance Criteria**:
  - [ ] Framework supports adding/removing checks
  - [ ] Configuration-driven
  - [ ] Each check is independently testable
  - [ ] Documentation complete

#### Task 1.8: Implement Default Validation Checks
- **Priority**: P0
- **Status**: Not Started
- **Description**: Implement the 7 default validation checks
- **Dependencies**: Task 1.7
- **Files to Create**:
  - `modules/core/src/validation/checks/publicClarity.ts`
  - `modules/core/src/validation/checks/alignmentWithDebate.ts`
  - `modules/core/src/validation/checks/simplicityWithoutBias.ts`
  - `modules/core/src/validation/checks/anchoringInNews.ts`
  - `modules/core/src/validation/checks/explicitObjective.ts`
  - `modules/core/src/validation/checks/clearBinaryNature.ts`
  - `modules/core/src/validation/checks/answerableWithEvidence.ts`
- **Acceptance Criteria**:
  - [ ] All 7 checks implemented
  - [ ] Each check returns pass/fail with notes
  - [ ] Unit tests for each check
  - [ ] Integration tests

## Phase 2: Core Analysis (Weeks 3-4)

### Topic Management

#### Task 2.1: Implement Topic Matching
- **Priority**: P1
- **Status**: Not Started
- **Description**: Implement proactive topic matching using keyword matching
- **Dependencies**: Task 1.2
- **Files to Create**:
  - `modules/core/src/analysis/topicMatcher.ts`
- **Acceptance Criteria**:
  - [ ] Keyword-based matching
  - [ ] Only matching articles assigned to topics
  - [ ] Confidence scoring
  - [ ] Unit tests

#### Task 2.2: Create Initial Topics
- **Priority**: P1
- **Status**: Not Started
- **Description**: Create 3 initial topics from PRD (Gaza, Drug Policy, AI Regulation)
- **Dependencies**: Task 1.2
- **Files to Create**:
  - `modules/db/src/scripts/seedTopics.ts`
- **Acceptance Criteria**:
  - [ ] 3 topics created in database
  - [ ] Seed script executable
  - [ ] Documentation for adding new topics

### Question Management

#### Task 2.3: Implement Question Validation
- **Priority**: P0
- **Status**: Not Started
- **Description**: Implement question validation using the framework
- **Dependencies**: Task 1.7, Task 1.8
- **Files to Create**:
  - `modules/core/src/analysis/questionValidator.ts`
- **Acceptance Criteria**:
  - [ ] Validates questions against framework
  - [ ] Returns validation results
  - [ ] Supports reformulation suggestions
  - [ ] Unit tests

#### Task 2.4: Implement Question Matching
- **Priority**: P1
- **Status**: Not Started
- **Description**: Implement proactive question matching
- **Dependencies**: Task 1.2, Task 2.3
- **Files to Create**:
  - `modules/core/src/analysis/questionMatcher.ts`
- **Acceptance Criteria**:
  - [ ] Only matching articles analyzed
  - [ ] Confidence scoring
  - [ ] Unit tests

#### Task 2.5: Create Initial Questions
- **Priority**: P1
- **Status**: Not Started
- **Description**: Create pre-defined questions from PRD and validate them
- **Dependencies**: Task 2.3, Task 2.4
- **Files to Create**:
  - `modules/db/src/scripts/seedQuestions.ts`
- **Acceptance Criteria**:
  - [ ] Questions created and validated
  - [ ] All questions pass framework validation
  - [ ] Seed script executable

### Stance Classification

#### Task 2.6: Implement Stance Classifier
- **Priority**: P0
- **Status**: Not Started
- **Description**: Implement LLM-based stance classification with monthly tracking
- **Dependencies**: Task 1.5, Task 1.2
- **Files to Create**:
  - `modules/core/src/analysis/stanceClassifier.ts`
  - `modules/core/src/llm/prompts/stanceClassification.ts`
- **Acceptance Criteria**:
  - [ ] Classifies stance per article-question-month triad
  - [ ] Returns confidence score
  - [ ] Returns reasoning
  - [ ] Handles monthly period correctly
  - [ ] Unit tests
  - [ ] Integration tests

#### Task 2.7: Implement Monthly Period Logic
- **Priority**: P0
- **Status**: Not Started
- **Description**: Implement logic for monthly stance tracking
- **Dependencies**: Task 1.2
- **Files to Create**:
  - `modules/core/src/utils/monthPeriod.ts`
- **Acceptance Criteria**:
  - [ ] Always uses first day of month (YYYY-MM-01)
  - [ ] Uses last month's data as current month
  - [ ] Helper functions for month calculations
  - [ ] Unit tests

## Phase 3: Verdict Calculation (Weeks 5-6)

### Consensus Calculation

#### Task 3.1: Implement Verdict Calculator
- **Priority**: P0
- **Status**: Not Started
- **Description**: Implement weighted consensus verdict calculation
- **Dependencies**: Task 2.6, Task 1.2
- **Files to Create**:
  - `modules/core/src/analysis/verdictCalculator.ts`
- **Acceptance Criteria**:
  - [ ] Calculates support share (S)
  - [ ] Calculates variance
  - [ ] Determines verdict label
  - [ ] Calculates confidence
  - [ ] Uses outlet credibility for weighting
  - [ ] Uses outlet ideology for normalization (backend-only)
  - [ ] Filters by month period
  - [ ] Unit tests
  - [ ] Integration tests

#### Task 3.2: Implement Monthly Verdict Calculation
- **Priority**: P0
- **Status**: Not Started
- **Description**: Ensure verdicts are calculated per month period
- **Dependencies**: Task 3.1, Task 2.7
- **Files to Update**:
  - `modules/core/src/analysis/verdictCalculator.ts`
- **Acceptance Criteria**:
  - [ ] Verdicts calculated per month
  - [ ] Historical verdicts preserved
  - [ ] Efficient queries using composite index
  - [ ] Unit tests

## Phase 4: Batch Processing & Queue (Weeks 7-8)

### Queue System

#### Task 4.1: Design Queue System
- **Priority**: P1
- **Status**: Not Started
- **Description**: Design database-backed queue system
- **Dependencies**: None
- **Files to Create**:
  - `modules/core/src/queue/queue.ts`
  - `modules/core/src/queue/types.ts`
- **Acceptance Criteria**:
  - [ ] Queue design documented
  - [ ] Supports priority
  - [ ] Supports batch processing
  - [ ] Error handling strategy

#### Task 4.2: Implement Queue System
- **Priority**: P1
- **Status**: Not Started
- **Description**: Implement database-backed queue
- **Dependencies**: Task 4.1
- **Files to Create**:
  - `modules/core/src/queue/queue.ts`
- **Acceptance Criteria**:
  - [ ] Enqueue/dequeue operations
  - [ ] Priority support
  - [ ] Batch processing
  - [ ] Retry logic
  - [ ] Unit tests

#### Task 4.3: Implement Batch Processing Job
- **Priority**: P1
- **Status**: Not Started
- **Description**: Implement batch processing job for article analysis
- **Dependencies**: Task 4.2, Task 2.6, Task 3.1
- **Files to Create**:
  - `apps/api/src/jobs/analysisPipeline.ts`
- **Acceptance Criteria**:
  - [ ] Processes articles in batches
  - [ ] Handles errors gracefully
  - [ ] Logs progress
  - [ ] Configurable batch size
  - [ ] Integration tests

## Phase 5: Evidence Extraction (Deferred)

### Evidence Extraction

#### Task 5.1: Design Evidence Extraction
- **Priority**: P3
- **Status**: Deferred
- **Description**: Design evidence extraction system
- **Dependencies**: Phase 3 complete
- **Notes**: Deferred to later phase

#### Task 5.2: Implement Evidence Extraction
- **Priority**: P3
- **Status**: Deferred
- **Description**: Implement evidence bullet extraction
- **Dependencies**: Task 5.1
- **Notes**: Deferred to later phase

## Testing & Quality Assurance

### Unit Tests

#### Task 6.1: Unit Tests for Repositories
- **Priority**: P1
- **Status**: Not Started
- **Description**: Write comprehensive unit tests for all repositories
- **Dependencies**: Task 1.2
- **Acceptance Criteria**:
  - [ ] All repository methods tested
  - [ ] Edge cases covered
  - [ ] Mock database interactions

#### Task 6.2: Unit Tests for Analysis Logic
- **Priority**: P1
- **Status**: Not Started
- **Description**: Write unit tests for analysis functions
- **Dependencies**: Phase 2, Phase 3
- **Acceptance Criteria**:
  - [ ] All analysis functions tested
  - [ ] Edge cases covered
  - [ ] Mock LLM responses

### Integration Tests

#### Task 6.3: Integration Tests for Pipeline
- **Priority**: P2
- **Status**: Not Started
- **Description**: Write integration tests for full pipeline
- **Dependencies**: Phase 4
- **Acceptance Criteria**:
  - [ ] End-to-end pipeline tested
  - [ ] Database interactions tested
  - [ ] LLM provider switching tested

## Documentation

#### Task 7.1: API Documentation
- **Priority**: P2
- **Status**: Not Started
- **Description**: Document all API endpoints and types
- **Dependencies**: Implementation complete
- **Acceptance Criteria**:
  - [ ] All endpoints documented
  - [ ] Request/response examples
  - [ ] Error handling documented

#### Task 7.2: Developer Guide
- **Priority**: P2
- **Status**: Not Started
- **Description**: Create developer guide for extending the system
- **Dependencies**: Implementation complete
- **Acceptance Criteria**:
  - [ ] How to add new LLM provider
  - [ ] How to add new validation check
  - [ ] How to add new topic/question
  - [ ] Architecture overview

## Timeline Summary

- **Weeks 1-2**: Foundation (Database, LLM abstraction, Validation framework)
- **Weeks 3-4**: Core Analysis (Topic/Question matching, Stance classification)
- **Weeks 5-6**: Verdict Calculation
- **Weeks 7-8**: Batch Processing & Queue
- **Future**: Evidence Extraction (Phase 5)

## Dependencies Graph

```
Task 1.1 (Migration)
  ├─> Task 1.2 (Repositories)
  │     └─> Task 1.3 (Update Article Repo)
  │
  ├─> Task 1.4 (LLM Interface)
  │     └─> Task 1.5 (OpenAI Provider)
  │           └─> Task 2.6 (Stance Classifier)
  │
  └─> Task 1.7 (Validation Framework)
        └─> Task 1.8 (Default Checks)
              └─> Task 2.3 (Question Validator)
                    └─> Task 2.4 (Question Matcher)
                          └─> Task 2.5 (Seed Questions)
```

## Risk Mitigation

- **LLM API Failures**: Retry logic with exponential backoff (Task 1.5)
- **Migration Issues**: Test on development database first (Task 1.1)
- **Performance**: Composite indexes for monthly queries (Task 1.1)
- **Data Quality**: Validation framework ensures question quality (Task 1.7, Task 1.8)

