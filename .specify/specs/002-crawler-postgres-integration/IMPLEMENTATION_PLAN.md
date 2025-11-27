# Implementation Plan: Crawler PostgreSQL Integration

**Feature**: Integrate PostgreSQL as canonical queue and storage for crawler  
**Based on**: `documentation/tech_specs/crawler_postgres.md`  
**Created**: 2025-01-27

## Overview

Migrate the crawler from file-based Crawlee storage to PostgreSQL, making PostgreSQL the single source of truth for:
- URL queue (CrawlRequest table)
- Extracted articles (Article table)
- Processing state and status

Crawlee becomes a stateless worker that processes batches from PostgreSQL.

## Architecture Changes

### Current State
- RSS feeds → Crawlee internal queue → File-based storage
- Two-phase: RSS processing → Article extraction
- Storage in `apps/crawler/storage/` (file-based)

### Target State
- RSS feeds → PostgreSQL (CrawlRequest table) → Crawlee batch processing → PostgreSQL (Article table)
- PostgreSQL as canonical queue
- Crawlee as stateless worker
- All state in PostgreSQL

## Implementation Phases

### Phase 1: Database Foundation
**Goal**: Set up PostgreSQL infrastructure and basic schema

**Tasks**:
1. Set up local PostgreSQL (Docker or local install)
2. Create `modules/db` with Prisma schema
3. Define CrawlRequest and Article entities
4. Set up database connection and configuration
5. Create initial migration

### Phase 2: RSS → PostgreSQL Queue
**Goal**: Move RSS discovery to write to PostgreSQL instead of Crawlee queue

**Tasks**:
1. Create CrawlRequest repository
2. Update RSS handler to write to PostgreSQL
3. Implement URL normalization and deduplication
4. Remove dependency on Crawlee's pending articles queue
5. Test RSS → DB flow

### Phase 3: Crawler → PostgreSQL Batch Processing
**Goal**: Make crawler pull work from PostgreSQL instead of internal queue

**Tasks**:
1. Create batch selection logic (get pending requests)
2. Update status management (pending → in_progress → done/failed)
3. Refactor refreshFeeds.js to use PostgreSQL queue
4. Update Crawlee integration to work with DB batches
5. Test batch processing flow

### Phase 4: Persist Results to PostgreSQL
**Goal**: Store extracted articles in PostgreSQL

**Tasks**:
1. Create Article repository
2. Update article extraction to write to PostgreSQL
3. Link articles to CrawlRequest records
4. Handle success and failure cases
5. Test end-to-end flow

### Phase 5: Remove File-Based Storage Dependency
**Goal**: Eliminate Crawlee file storage, use only PostgreSQL

**Tasks**:
1. Remove Crawlee storage configuration
2. Update all storage references to use repositories
3. Remove file-based deduplication logic
4. Clean up old storage utilities
5. Verify no file storage dependencies remain

### Phase 6: Validation & Testing
**Goal**: Verify integration works correctly

**Tasks**:
1. Test connectivity and basic operations
2. Test queue population from RSS
3. Test processing flow (pending → in_progress → done)
4. Test idempotence (no duplicates on re-run)
5. Add monitoring/logging for metrics

### Phase 7: Migration & Cleanup
**Goal**: Migrate existing data and clean up

**Tasks**:
1. Create migration script for existing articles (if any)
2. Update documentation
3. Remove unused file-based storage code
4. Update .gitignore for new structure
5. Final validation

## Dependencies

**Prerequisites**:
- PostgreSQL instance (local or Docker)
- Prisma ORM setup in `modules/db`
- Environment configuration in `modules/config`

**Blocking Dependencies**:
- Phase 1 must complete before any other phase
- Phase 2 must complete before Phase 3
- Phase 3 must complete before Phase 4
- Phase 5 can run in parallel with Phase 4
- Phase 6 (Validation) should complete before Phase 7 (Cleanup)

## Success Criteria

- ✅ RSS feeds write to PostgreSQL CrawlRequest table
- ✅ Crawler pulls batches from PostgreSQL
- ✅ Articles stored in PostgreSQL Article table
- ✅ No file-based storage dependencies
- ✅ Idempotent execution (safe to re-run)
- ✅ Proper status tracking (pending → in_progress → done/failed)
- ✅ All existing functionality preserved

## Risk Mitigation

- **Data Loss**: Keep file-based storage as backup during migration
- **Breaking Changes**: Implement feature flag or gradual migration
- **Performance**: Batch processing with configurable batch sizes
- **Testing**: Comprehensive validation checklist before removing old code

