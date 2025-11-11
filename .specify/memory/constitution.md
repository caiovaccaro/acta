<!--
Sync Impact Report:
Version change: 1.0.0 → 2.0.0 (major expansion to full platform)
Modified principles:
  - I. Event-Driven Architecture → Expanded to cover full platform (Crawler, API, Web)
  - II. Data Quality → Updated to PostgreSQL + Prisma
  - IV. Structured Data Schema → Updated to Prisma schema
  - V. Modular Design → Expanded to monorepo structure
  - VI. Export Capabilities → Expanded to API endpoints
Added principles:
  - VII. Monorepo Organization
  - VIII. Type Safety & TypeScript
  - IX. Consensus Computation Integrity
  - X. Ideological Balance & Transparency
Added sections:
  - Monorepo Structure Standards
  - Platform Architecture (apps and modules)
  - Database & Data Layer
  - API & Frontend Standards
Templates requiring updates:
  ✅ plan-template.md - Constitution Check section references this file
  ✅ spec-template.md - No direct references, but aligns with principles
  ✅ tasks-template.md - No direct references, but aligns with principles
Follow-up TODOs: None
-->

# Acta Platform Constitution

## Core Principles

### I. Event-Driven, Decoupled Architecture
The platform MUST maintain strict separation between ingestion (Crawler), processing (API services), and presentation (Web). These applications operate independently and communicate through:
- **Crawler → Database**: Stores articles via Prisma repositories
- **API → Database**: Reads articles and computes consensus via repositories
- **Web → API**: Consumes REST endpoints, no direct database access

This enables:
- Independent scaling and deployment of each application
- Fault isolation (crawler failures don't block API/Web)
- Flexible deployment options (apps can run on different schedules/hosts)
- Easy testing of individual components
- Clear data flow and responsibility boundaries

### II. Data Quality & Deduplication (NON-NEGOTIABLE)
Every article MUST be deduplicated before processing. The system MUST track processed articles using PostgreSQL (via Prisma) and prevent re-processing across crawler runs. Articles are only marked as processed after successful full content extraction and storage. This ensures:
- No duplicate data in database
- Efficient resource usage
- Data integrity across multiple runs
- Reliable incremental updates
- Consistent article references across the platform

### III. Fallback Strategy
All parsing operations MUST implement a primary strategy with a fallback mechanism. The article parser MUST attempt Mozilla Readability first, then fall back to generic HTML parsing if Readability fails. RSS parsing MUST support both RSS 2.0 and Atom formats. LLM processing MUST handle API failures gracefully with retry logic and fallback responses. This ensures:
- Maximum extraction success rate
- Resilience to varying website structures
- Graceful degradation when primary methods fail
- Consistent data output regardless of source format
- System availability even when external services fail

### IV. Structured Data Schema
All data MUST conform to Prisma schema definitions in `modules/db/prisma/schema.prisma`. All applications MUST use Prisma repositories for data access - no direct SQL queries. DTOs in `modules/shared` MUST define data contracts between apps. This ensures:
- Consistent data structure across all applications
- Type safety through Prisma-generated types
- Predictable data access patterns
- Easy schema evolution through migrations
- Prevention of schema drift between apps

### V. Modular, Single-Responsibility Design
Each module and application MUST have a single, well-defined responsibility:
- **apps/crawler**: Ingestion only (RSS fetching, article extraction, storage)
- **apps/api**: Business logic and data serving (consensus computation, API endpoints)
- **apps/web**: Presentation only (UI components, API consumption)
- **modules/db**: Data access layer (Prisma schema, repositories)
- **modules/core**: Pure domain logic (consensus algorithms, stance labeling, LLM prompts)
- **modules/config**: Configuration and environment validation
- **modules/shared**: Shared types and DTOs

This ensures:
- Easy testing and maintenance
- Clear code organization
- Reusable components across apps
- Reduced coupling between modules
- Clear boundaries for team ownership

### VI. API-First Data Access
The Web application MUST NOT access the database directly. All data access MUST go through the API layer. The API MUST expose well-defined REST endpoints with proper error handling and status codes. This ensures:
- Single source of truth for business logic
- Consistent data access patterns
- Easy API versioning and evolution
- Clear separation of concerns
- Simplified frontend development

### VII. Monorepo Organization (NON-NEGOTIABLE)
The project MUST be organized as a pnpm workspace monorepo with strict module boundaries:
- **apps/**: Deployable runtimes (api, web, crawler)
- **modules/**: Shared logic (db, core, config, shared)
- **infra/**: Infrastructure configuration (docker, aws)

Module imports MUST use workspace aliases (`@acta/<module>`) defined in `tsconfig.base.json`. Apps MUST NOT import from other apps directly - only through shared modules. This ensures:
- Clear dependency graph
- Easy refactoring and code sharing
- Consistent build and deployment
- Simplified dependency management
- Enforced architectural boundaries

### VIII. Type Safety & TypeScript (NON-NEGOTIABLE)
All code MUST be written in TypeScript with strict mode enabled. Type definitions MUST be shared through `modules/shared` to prevent type drift. Prisma-generated types MUST be used for database entities. API contracts MUST be typed (request/response DTOs). This ensures:
- Compile-time error detection
- Self-documenting code through types
- Refactoring safety
- Better IDE support
- Reduced runtime errors

### IX. Consensus Computation Integrity
All consensus and verdict calculations MUST be implemented in `modules/core` as pure, testable functions with no I/O. The computation logic MUST:
- Use ideologically balanced source weighting (Left/Center/Right buckets)
- Normalize outlet credibility scores
- Calculate support share (S) and variance correctly
- Produce deterministic verdicts (Yes/Leaning Yes/Split/Leaning No/No)
- Compute confidence scores (0-100%) based on distance from 0.5 and variance

This ensures:
- Transparent and auditable verdict computation
- Testable consensus logic
- Reproducible results
- Easy debugging and validation
- Clear methodology for users

### X. Ideological Balance & Transparency
The platform MUST maintain ideological balance in source selection (~⅓ each: Left, Center, Right). Outlet credibility scores MUST be computed from external trust metrics (Ad Fontes, MBFC, Reuters Institute) and transparency factors. The system MUST:
- Normalize weights so each ideology bucket sums to equal total weight
- Display full transparency panel with outlet metadata
- Explain verdict calculation methodology publicly
- Allow filtering by ideology in transparency views
- Handle missing credibility data gracefully (default to 0.5 Provisional)

This ensures:
- Balanced perspective representation
- User trust through transparency
- Accountability for source selection
- Fair consensus computation
- Ethical information presentation

## Architecture Standards

### Technology Stack
- **Language**: TypeScript / Node.js 20+
- **Monorepo**: pnpm workspaces
- **Frontend**: Next.js 14 + Tailwind + shadcn/ui
- **Backend API**: Fastify
- **Crawler**: Crawlee 3.0+ for web scraping and crawling
- **Database**: PostgreSQL (AWS RDS) + pgvector for semantic search
- **ORM**: Prisma
- **Parsing**: Mozilla Readability (primary), Cheerio (fallback)
- **Hosting**: AWS (RDS, EC2/Fargate) or Render/Fly.io
- **Containerization**: Docker support required

### Monorepo Structure
```
acta/
  apps/
    api/          # Fastify backend API
    web/          # Next.js frontend
    crawler/      # Crawlee ingestion service
  modules/
    db/           # Prisma schema and repositories
    core/         # Domain logic (consensus, analysis, LLM)
    config/       # Configuration and environment
    shared/       # Shared DTOs and types
  infra/
    docker/       # Local development setup
    aws/          # Terraform/CloudFormation
```

### Application Responsibilities

**apps/crawler:**
- Fetch and parse RSS feeds from verified outlets
- Deduplicate articles
- Crawl and extract article content
- Store structured data into PostgreSQL via Prisma
- Run periodically (cron / scheduled job)

**apps/api:**
- Serve REST endpoints: `/topics`, `/verdict`, `/consensus-thermometer`, `/debate`, `/transparency`, `/feedback`
- Integrate with `modules/db` (Prisma repositories)
- Use `modules/core` for consensus and analysis logic
- Expose health checks and admin endpoints
- Handle authentication and error handling

**apps/web:**
- Render Verdict Cards, Debate Cards, and Consensus Thermometers
- Provide "Pick Your Cause" wizard flow
- Consume API endpoints through typed apiClient
- Styled with Tailwind + shadcn/ui
- No direct database access

### Module Responsibilities

**modules/db:**
- Define all Prisma entities (Outlet, Article, Analysis, Consensus, Feedback)
- Connect to PostgreSQL / RDS
- Expose reusable repository methods
- Integrate pgvector for semantic search
- Handle migrations

**modules/core:**
- Verdict computation (support share, variance, confidence)
- Stance labeling and normalization
- LLM prompt templates for stance, debate, and unknown extraction
- Pure, testable logic with no I/O
- No dependencies on apps or other modules (except config)

**modules/config:**
- Parse and validate environment variables
- Store project-wide constants (topics, thresholds, refresh windows)
- Centralized configuration for all apps

**modules/shared:**
- Define data contracts (DTOs) between API, Web, and Crawler
- Prevent schema drift across apps
- Shared event types and API contracts

## Database & Data Layer

### Schema Requirements
All database entities MUST be defined in `modules/db/prisma/schema.prisma`:
- **Outlet**: Source metadata (name, ideology, credibility score, RSS feeds)
- **Article**: Extracted content (title, textContent, metadata, timestamps)
- **Analysis**: LLM-processed data (stance, arguments, unknowns)
- **Consensus**: Computed verdicts (verdict label, confidence, support share)
- **Feedback**: User feedback and calibration data

### Data Access Patterns
- All database access MUST go through Prisma repositories in `modules/db/src/repositories/`
- Apps MUST NOT write raw SQL queries
- Repository methods MUST return typed entities (Prisma-generated types)
- Transactions MUST be handled at repository level when needed
- Migrations MUST be versioned and tested

### Data Quality
- Empty or invalid article links MUST be skipped during ingestion
- Missing required fields MUST be handled gracefully (nullable fields, defaults)
- All dates MUST be normalized to ISO 8601 format
- Article content MUST be validated before LLM processing
- Consensus data MUST be recalculated on article updates

## API & Frontend Standards

### API Design
- RESTful endpoints with proper HTTP methods and status codes
- Request/response DTOs defined in `modules/shared`
- Error responses MUST follow consistent format
- Health check endpoint required (`/health`)
- API versioning strategy (when needed)

### Frontend Standards
- Next.js App Router structure
- Server and client components clearly separated
- API calls through typed `apiClient` in `lib/apiClient.ts`
- Components organized by feature (VerdictCard, ConsensusThermometer, etc.)
- Responsive design with Tailwind CSS
- Accessibility (WCAG AA compliance)

## Development Workflow

### Code Organization
- Use TypeScript strict mode (defined in `tsconfig.base.json`)
- Follow single-responsibility principle
- Keep functions pure where possible (especially in `modules/core`)
- Use async/await for all asynchronous operations
- Implement proper error handling and logging
- Use workspace aliases for imports (`@acta/<module>`)

### Testing Requirements
- Unit tests for `modules/core` logic (consensus computation, stance labeling)
- Integration tests for API endpoints
- Contract tests for data schema compliance
- E2E tests for critical user flows (Web app)
- Tests MUST be written before implementation (TDD when applicable)
- Testing frameworks: Jest or Vitest recommended

### Documentation
- README MUST be kept up-to-date with architecture changes
- Code comments for complex logic (consensus algorithms, LLM prompts)
- JSDoc-style comments for exported functions
- API documentation (OpenAPI/Swagger when needed)
- Clear error messages in logs
- Architecture decisions documented in `documentation/` folder

### Environment Management
- Environment variables centralized in `modules/config/env.ts`
- Validation of required environment variables at startup
- Separate `.env` files for local development
- Secrets management for production (AWS Secrets Manager or similar)

## Governance

### Constitution Authority
This constitution supersedes all other development practices and coding standards. All code changes MUST comply with these principles.

### Amendment Process
1. Proposed amendments MUST be documented with rationale
2. Amendments require review and approval
3. Version MUST be incremented per semantic versioning:
   - **MAJOR**: Backward-incompatible principle changes or removals
   - **MINOR**: New principles or significant expansions
   - **PATCH**: Clarifications, wording improvements, non-semantic refinements
4. All dependent templates and documentation MUST be updated
5. Migration plan required for breaking changes

### Compliance Review
- All PRs MUST verify compliance with constitution principles
- Architecture changes MUST be justified if they violate principles
- Complexity additions MUST be documented in Complexity Tracking sections
- Violations MUST be explicitly justified or the change rejected
- Monorepo structure violations MUST be caught in CI/CD

### Version Control
- Constitution changes MUST be committed with clear messages
- Format: `docs: amend constitution to vX.Y.Z (description of changes)`
- Constitution file MUST include Sync Impact Report in HTML comments
- Changes affecting monorepo structure MUST update `documentation/structure.md`

**Version**: 2.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
