# Implementation Plan: Article Analysis & Verdict Pipeline

**Branch**: `003-article-analysis-pipeline` | **Date**: 2025-01-27 | **Spec**: `.specify/specs/003-article-analysis-pipeline/spec.md`
**Input**: Feature specification from `/.specify/specs/003-article-analysis-pipeline/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement an article analysis pipeline that processes crawled articles to extract questions, classify stances, and generate consensus verdicts. The system uses OpenAI GPT-4 Turbo for LLM-based analysis, proactively matches articles to pre-defined topics and questions, classifies article stances per question, and calculates weighted consensus verdicts. The implementation follows a batch processing approach with queue management, smart caching, and confidence-based quality assurance.

## Technical Context

**Language/Version**: TypeScript / Node.js 20+  
**Primary Dependencies**: OpenAI API (GPT-4 Turbo), Prisma ORM, PostgreSQL with pgvector, pnpm workspaces  
**Storage**: PostgreSQL (existing `modules/db` with Prisma schema)  
**Testing**: Jest with TypeScript support  
**Target Platform**: Linux server (Node.js runtime)  
**Project Type**: Monorepo module (adds to existing `modules/core` and extends `modules/db`)  
**Performance Goals**: 
- Process 100 articles per hour in batch mode
- Question extraction: < 30 seconds per topic (10-50 articles)
- Stance classification: 10 articles per minute
- Verdict calculation: < 5 seconds per question
**Constraints**: 
- Budget: $200-300/month for LLM API calls
- Batch processing required for cost optimization
- Confidence thresholds for quality assurance
- Retry with exponential backoff for API failures
**Scale/Scope**: 
- Initial: 3 pre-defined topics (Gaza, Drug Policy, AI Regulation)
- Process all articles matching pre-defined topics/questions
- Support multiple questions per topic
- Queue system for batch processing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### ✅ I. Event-Driven, Decoupled Architecture
**Status**: COMPLIANT
- Analysis pipeline runs as background job (can be in `apps/api` or separate service)
- Processes articles from database (via Prisma repositories)
- No direct coupling to crawler or web app
- Results stored in database for API consumption

### ✅ II. Data Quality & Deduplication
**Status**: COMPLIANT
- Uses existing Prisma repositories for article access
- ArticleAnalysis has unique constraint on (articleId, questionId) preventing duplicates
- TopicArticle join table prevents duplicate assignments

### ✅ III. Fallback Strategy
**Status**: COMPLIANT
- LLM API failures: Retry with exponential backoff
- Low confidence classifications: Flag for review, fallback to pre-defined questions
- Question validation failures: Flag for review, use pre-defined questions

### ✅ IV. Structured Data Schema
**Status**: COMPLIANT
- All new entities defined in `modules/db/prisma/schema.prisma`
- Uses Prisma repositories for data access
- Type-safe with Prisma-generated types

### ✅ V. Modular, Single-Responsibility Design
**Status**: COMPLIANT
- Analysis logic in `modules/core` (pure functions, no I/O)
- LLM integration in `modules/core` (prompt templates, classification logic)
- Data access via `modules/db` repositories
- Queue processing can be in `apps/api` or separate service

### ✅ VI. API-First Data Access
**Status**: COMPLIANT
- Analysis results stored in database
- API will expose verdicts via REST endpoints (future)
- No direct database access from web app

### ✅ VII. Monorepo Organization
**Status**: COMPLIANT
- New code in `modules/core` (analysis logic) and `modules/db` (schema/repositories)
- Uses workspace aliases (`@acta/db`, `@acta/core`)
- No cross-app imports

### ✅ VIII. Type Safety & TypeScript
**Status**: COMPLIANT
- All code in TypeScript with strict mode
- Prisma-generated types for entities
- Shared types in `modules/shared` for API contracts

### ✅ IX. Consensus Computation Integrity
**Status**: COMPLIANT
- Verdict calculation in `modules/core` as pure functions
- Uses outlet credibility weighting
- Calculates support share (S) and variance correctly
- Deterministic verdict labels and confidence scores

### ✅ X. Ideological Balance & Transparency
**Status**: COMPLIANT
- Uses outlet ideology for weighting (from existing Outlet model)
- Normalizes weights across ideology buckets
- Article ideology inferred from outlet ideology (backend-only)
- Ideology **NEVER exposed in UI or API** - backend-only for calculations

**Overall Status**: ✅ ALL GATES PASS

## Project Structure

### Documentation (this feature)

```text
.specify/specs/003-article-analysis-pipeline/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
modules/
├── core/                    # Domain logic (NEW: analysis pipeline)
│   ├── src/
│   │   ├── analysis/       # Analysis pipeline logic
│   │   │   ├── topicMatcher.ts      # Proactive topic matching
│   │   │   ├── questionMatcher.ts   # Proactive question matching
│   │   │   ├── questionValidator.ts # LLM question validation
│   │   │   ├── stanceClassifier.ts  # LLM stance classification
│   │   │   ├── verdictCalculator.ts # Consensus calculation
│   │   │   └── evidenceExtractor.ts # Evidence bullet extraction
│   │   ├── llm/            # LLM integration
│   │   │   ├── client.ts            # OpenAI client with retry
│   │   │   ├── prompts/             # Prompt templates
│   │   │   │   ├── questionValidation.ts
│   │   │   │   ├── stanceClassification.ts
│   │   │   │   └── evidenceExtraction.ts
│   │   │   └── batchProcessor.ts    # Batch API calls
│   │   └── index.ts
│   └── tests/
│       └── analysis/
│
├── db/                      # Database layer (EXTENDED)
│   ├── prisma/
│   │   └── schema.prisma    # Add: Topic, Question, ArticleAnalysis, Verdict, EvidenceBullet, TopicArticle
│   └── src/
│       ├── repositories/
│       │   ├── topicRepository.ts        # NEW
│       │   ├── questionRepository.ts     # NEW
│       │   ├── articleAnalysisRepository.ts # NEW
│       │   ├── verdictRepository.ts      # NEW
│       │   └── evidenceBulletRepository.ts # NEW
│       └── migrations/
│
└── shared/                  # Shared types (EXTENDED)
    └── src/
        └── types/
            └── analysis.ts  # DTOs for analysis pipeline

apps/
└── api/                     # API service (EXTENDED)
    └── src/
        └── jobs/            # Background jobs
            └── analysisPipeline.ts  # Batch processing job
```

**Structure Decision**: 
- Analysis logic in `modules/core` (pure, testable functions)
- LLM integration in `modules/core/llm` (reusable across features)
- Database schema extended in `modules/db`
- Batch processing job in `apps/api/src/jobs` (can run as scheduled task)
- Follows existing monorepo structure and module boundaries

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all gates passed.
