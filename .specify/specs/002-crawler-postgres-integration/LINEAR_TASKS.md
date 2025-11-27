# Linear Tasks: Crawler PostgreSQL Integration

**Parent Issue**: Crawler PostgreSQL Integration  
**Created**: 2025-01-27

## Task Format for Linear Import

Use this format to create tasks in Linear. Each task includes:
- Title
- Description
- Status (Todo/In Progress)
- Priority (High/Medium/Low)
- Dependencies
- Estimated effort

---

## Phase 1: Database Foundation

### Task 1.1: Set up Local PostgreSQL Instance
**Title**: Set up local PostgreSQL for development  
**Description**: 
- Set up PostgreSQL instance locally (Docker Compose or local install)
- Configure connection string in environment variables
- Document setup process in README
- Ensure pgvector extension available for future use

**Priority**: High  
**Status**: Todo  
**Dependencies**: None  
**Effort**: 2-3 hours  
**Labels**: `infrastructure`, `database`, `setup`

---

### Task 1.2: Initialize Prisma in modules/db
**Title**: Initialize Prisma ORM in modules/db  
**Description**:
- Create `modules/db/package.json` with Prisma dependencies
- Initialize Prisma schema file
- Set up TypeScript configuration
- Configure Prisma client generation
- Add database connection utilities

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.1  
**Effort**: 2-3 hours  
**Labels**: `database`, `prisma`, `setup`

---

### Task 1.3: Define CrawlRequest Entity Schema
**Title**: Create CrawlRequest Prisma model  
**Description**:
- Define CrawlRequest model in Prisma schema with fields:
  - id (UUID or auto-increment)
  - url (unique, indexed)
  - outletId (foreign key to Outlet)
  - status (enum: pending, in_progress, done, failed)
  - attempts (integer, default 0)
  - errorMessage (text, nullable)
  - createdAt, updatedAt (timestamps)
- Add appropriate indexes for query performance
- Add validation constraints

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 1-2 hours  
**Labels**: `database`, `schema`, `crawler`

---

### Task 1.4: Define Article Entity Schema
**Title**: Create Article Prisma model  
**Description**:
- Define Article model in Prisma schema with fields:
  - id (UUID or auto-increment)
  - url (unique, indexed)
  - crawlRequestId (foreign key to CrawlRequest)
  - outletId (foreign key to Outlet)
  - title (text)
  - textContent (text)
  - excerpt (text, nullable)
  - publishedDate (datetime, nullable)
  - extractedAt (datetime)
  - createdAt, updatedAt (timestamps)
- Add indexes for common queries
- Add validation constraints

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 1-2 hours  
**Labels**: `database`, `schema`, `articles`

---

### Task 1.5: Define Outlet Entity Schema (if not exists)
**Title**: Create Outlet Prisma model  
**Description**:
- Define Outlet model in Prisma schema with fields:
  - id (UUID or auto-increment)
  - name (string, unique)
  - ideology (enum: Left, Center, Right)
  - credibilityScore (decimal 0-1)
  - rssFeeds (JSON array of feed URLs)
  - createdAt, updatedAt (timestamps)
- Add indexes
- Link to existing outlets.json configuration

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 1.2  
**Effort**: 1-2 hours  
**Labels**: `database`, `schema`, `outlets`

---

### Task 1.6: Create Initial Migration
**Title**: Generate and run initial Prisma migration  
**Description**:
- Generate Prisma migration for CrawlRequest, Article, and Outlet models
- Review migration SQL
- Run migration against local database
- Verify tables created correctly
- Document migration process

**Priority**: High  
**Status**: Todo  
**Dependencies**: Tasks 1.3, 1.4, 1.5  
**Effort**: 1 hour  
**Labels**: `database`, `migration`

---

### Task 1.7: Set up Database Configuration Module
**Title**: Configure database connection in modules/config  
**Description**:
- Add DATABASE_URL to environment variable validation
- Create database configuration utilities
- Set up connection pooling configuration
- Add connection health check function
- Document environment setup

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.1, Task 1.2  
**Effort**: 1-2 hours  
**Labels**: `configuration`, `database`

---

## Phase 2: RSS → PostgreSQL Queue

### Task 2.1: Create CrawlRequest Repository
**Title**: Implement CrawlRequest repository in modules/db  
**Description**:
- Create `modules/db/src/repositories/crawlRequestRepo.ts`
- Implement methods:
  - `createOrUpdate(url, outletId)` - upsert logic
  - `findPending(limit, offset)` - get pending requests
  - `markInProgress(ids)` - update status to in_progress
  - `markDone(id, articleId)` - update status to done
  - `markFailed(id, errorMessage)` - update status to failed
- Add proper error handling
- Add TypeScript types

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.6  
**Effort**: 3-4 hours  
**Labels**: `database`, `repository`, `crawler`

---

### Task 2.2: Implement URL Normalization
**Title**: Create URL normalization utility  
**Description**:
- Create utility function to normalize URLs (remove query params, fragments, etc.)
- Handle URL canonicalization (www vs non-www, http vs https)
- Add URL validation
- Create unit tests
- Use in CrawlRequest repository

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 2.1  
**Effort**: 2-3 hours  
**Labels**: `utils`, `crawler`, `urls`

---

### Task 2.3: Update RSS Handler to Write to PostgreSQL
**Title**: Refactor RSS handler to use CrawlRequest repository  
**Description**:
- Update `apps/crawler/src/rss/handler.js` (or migrate to TypeScript)
- Replace `addPendingArticle()` calls with `crawlRequestRepo.createOrUpdate()`
- Remove dependency on Crawlee's KeyValueStore for pending articles
- Update RSS processing to write directly to PostgreSQL
- Maintain deduplication logic using database constraints

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 2.1, Task 2.2  
**Effort**: 3-4 hours  
**Labels**: `rss`, `crawler`, `postgres`

---

### Task 2.4: Remove Crawlee Pending Articles Queue
**Title**: Remove file-based pending articles queue  
**Description**:
- Remove `addPendingArticle()` from storage.js
- Remove `getAndClearPendingArticles()` from storage.js
- Update `enqueue.js` to be removed or repurposed
- Clean up related utilities
- Update imports

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 2.3  
**Effort**: 1-2 hours  
**Labels**: `cleanup`, `crawler`

---

### Task 2.5: Test RSS → PostgreSQL Flow
**Title**: Validate RSS feeds write to PostgreSQL  
**Description**:
- Run RSS processing job
- Verify CrawlRequest rows created in database
- Verify URL normalization works
- Verify deduplication prevents duplicates
- Check status is set to 'pending'
- Add logging for monitoring

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 2.3  
**Effort**: 2-3 hours  
**Labels**: `testing`, `rss`, `validation`

---

## Phase 3: Crawler → PostgreSQL Batch Processing

### Task 3.1: Create Batch Selection Logic
**Title**: Implement batch selection from PostgreSQL  
**Description**:
- Create function to select pending CrawlRequest records
- Add batch size configuration (default: 50)
- Add ordering (by createdAt ASC)
- Add optional filtering (by outlet)
- Return batch with metadata (count, next batch info)

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 2.1  
**Effort**: 2-3 hours  
**Labels**: `crawler`, `batch-processing`, `postgres`

---

### Task 3.2: Implement Status Management
**Title**: Create status update utilities  
**Description**:
- Create transaction-safe status update functions
- Implement optimistic locking to prevent race conditions
- Add retry logic for failed status updates
- Handle concurrent batch processing scenarios
- Add logging for status transitions

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 3.1  
**Effort**: 3-4 hours  
**Labels**: `crawler`, `database`, `concurrency`

---

### Task 3.3: Refactor refreshFeeds.js to Use PostgreSQL
**Title**: Update main crawler job to pull from PostgreSQL  
**Description**:
- Refactor `apps/crawler/src/jobs/refreshFeeds.js`
- Replace RSS → Crawlee direct flow with RSS → PostgreSQL → batch selection
- Update Phase 2 to pull batches from PostgreSQL instead of enqueuePendingArticles()
- Pass CrawlRequest IDs through Crawlee context
- Update error handling

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 3.1, Task 3.2  
**Effort**: 4-5 hours  
**Labels**: `crawler`, `refactor`, `postgres`

---

### Task 3.4: Update Crawlee Integration for DB Batches
**Title**: Modify Crawlee handlers to work with PostgreSQL batches  
**Description**:
- Update `articleCrawler.js` to accept CrawlRequest context
- Pass CrawlRequest ID through userData
- Ensure handlers can access database connection
- Update error handling to mark requests as failed
- Maintain Crawlee's internal queue only for batch execution

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 3.3  
**Effort**: 3-4 hours  
**Labels**: `crawler`, `crawlee`, `integration`

---

### Task 3.5: Test Batch Processing Flow
**Title**: Validate batch selection and processing  
**Description**:
- Test batch selection returns correct records
- Test status updates (pending → in_progress)
- Test concurrent batch processing (if applicable)
- Verify CrawlRequest IDs are passed correctly
- Test error handling and status rollback

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 3.4  
**Effort**: 2-3 hours  
**Labels**: `testing`, `validation`, `batch-processing`

---

## Phase 4: Persist Results to PostgreSQL

### Task 4.1: Create Article Repository
**Title**: Implement Article repository in modules/db  
**Description**:
- Create `modules/db/src/repositories/articleRepo.ts`
- Implement methods:
  - `create(articleData)` - create new article
  - `findByUrl(url)` - find by URL
  - `findByCrawlRequestId(crawlRequestId)` - find by crawl request
  - `upsert(articleData)` - create or update
  - `findByOutlet(outletId, limit, offset)` - query by outlet
- Add proper error handling
- Add TypeScript types

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.6  
**Effort**: 3-4 hours  
**Labels**: `database`, `repository`, `articles`

---

### Task 4.2: Update Article Extraction to Write to PostgreSQL
**Title**: Refactor article mapper to persist to database  
**Description**:
- Update `apps/crawler/src/mappers/articleMapper.js`
- Replace `pushData()` calls with `articleRepo.upsert()`
- Link articles to CrawlRequest via crawlRequestId
- Extract and store all article metadata
- Handle both new articles and updates

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.1, Task 3.4  
**Effort**: 3-4 hours  
**Labels**: `articles`, `mappers`, `postgres`

---

### Task 4.3: Link Articles to CrawlRequest Records
**Title**: Update CrawlRequest when article is created  
**Description**:
- After successful article extraction, update CrawlRequest:
  - Set status to 'done'
  - Link articleId (foreign key)
  - Set completedAt timestamp
- Use transactions to ensure atomicity
- Handle cases where article exists but CrawlRequest needs update

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.2  
**Effort**: 2-3 hours  
**Labels**: `database`, `crawler`, `articles`

---

### Task 4.4: Handle Success and Failure Cases
**Title**: Implement comprehensive error handling  
**Description**:
- On successful extraction: mark CrawlRequest as done, link article
- On failure: mark CrawlRequest as failed, increment attempts, store error message
- Add retry logic for transient failures (max attempts: 3)
- Handle partial failures in batch processing
- Add logging for all outcomes

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.3  
**Effort**: 3-4 hours  
**Labels**: `error-handling`, `crawler`, `resilience`

---

### Task 4.5: Test End-to-End Flow
**Title**: Validate complete RSS → DB → Crawler → DB flow  
**Description**:
- Run complete crawler job
- Verify RSS feeds create CrawlRequest records
- Verify batch selection works
- Verify articles are extracted and stored
- Verify CrawlRequest statuses update correctly
- Test failure scenarios
- Verify no duplicate articles created

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.4  
**Effort**: 3-4 hours  
**Labels**: `testing`, `e2e`, `validation`

---

## Phase 5: Remove File-Based Storage Dependency

### Task 5.1: Remove Crawlee Storage Configuration
**Title**: Remove file-based storage from Crawlee config  
**Description**:
- Remove `Configuration.getGlobalConfig().set('storageClientOptions')` from refreshFeeds.js
- Configure Crawlee to use in-memory storage only
- Verify Crawlee still functions correctly
- Update documentation

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 4.5  
**Effort**: 1 hour  
**Labels**: `cleanup`, `crawler`, `storage`

---

### Task 5.2: Update All Storage References to Use Repositories
**Title**: Replace file-based storage with repository calls  
**Description**:
- Find all references to Crawlee KeyValueStore
- Replace with appropriate repository methods
- Update deduplication logic to use database queries
- Remove storage.js file or repurpose it
- Update all imports

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 5.1  
**Effort**: 2-3 hours  
**Labels**: `refactor`, `storage`, `cleanup`

---

### Task 5.3: Remove File-Based Deduplication Logic
**Title**: Remove KeyValueStore deduplication  
**Description**:
- Remove `isArticleProcessed()` from storage.js
- Remove `markArticleAsProcessed()` from storage.js
- Replace with database queries (check if URL exists in Article table)
- Update all call sites
- Verify deduplication still works

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 5.2  
**Effort**: 2-3 hours  
**Labels**: `cleanup`, `deduplication`, `refactor`

---

### Task 5.4: Clean Up Old Storage Utilities
**Title**: Remove unused storage utilities  
**Description**:
- Remove or archive `apps/crawler/src/utils/storage.js`
- Remove `apps/crawler/storage/` directory (or document it's no longer used)
- Update .gitignore if needed
- Clean up related imports
- Update documentation

**Priority**: Low  
**Status**: Todo  
**Dependencies**: Task 5.3  
**Effort**: 1-2 hours  
**Labels**: `cleanup`, `storage`

---

### Task 5.5: Verify No File Storage Dependencies Remain
**Title**: Audit codebase for file storage references  
**Description**:
- Search codebase for Crawlee storage references
- Search for KeyValueStore usage
- Search for file-based storage paths
- Remove or update all found references
- Run full test suite to verify

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 5.4  
**Effort**: 2-3 hours  
**Labels**: `audit`, `cleanup`, `testing`

---

## Phase 6: Validation & Testing

### Task 6.1: Test Database Connectivity
**Title**: Validate PostgreSQL connection and basic operations  
**Description**:
- Test database connection from crawler app
- Test basic CRUD operations
- Test connection pooling
- Test connection retry logic
- Verify environment configuration works

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 1.7  
**Effort**: 1-2 hours  
**Labels**: `testing`, `database`, `connectivity`

---

### Task 6.2: Test Queue Population from RSS
**Title**: Validate RSS feeds create CrawlRequest records  
**Description**:
- Run RSS processing
- Verify CrawlRequest rows created
- Verify URL normalization
- Verify deduplication (no duplicates)
- Verify status is 'pending'
- Count records created

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 2.5  
**Effort**: 1-2 hours  
**Labels**: `testing`, `rss`, `validation`

---

### Task 6.3: Test Processing Flow Status Transitions
**Title**: Validate status updates work correctly  
**Description**:
- Test pending → in_progress transition
- Test in_progress → done transition
- Test in_progress → failed transition
- Test retry logic (failed → pending)
- Verify no status regressions
- Test concurrent batch handling

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.5  
**Effort**: 2-3 hours  
**Labels**: `testing`, `validation`, `status`

---

### Task 6.4: Test Idempotence
**Title**: Verify re-running job doesn't create duplicates  
**Description**:
- Run crawler job multiple times
- Verify no duplicate CrawlRequest records
- Verify no duplicate Article records
- Verify status updates are idempotent
- Test with same RSS feeds multiple times

**Priority**: High  
**Status**: Todo  
**Dependencies**: Task 4.5  
**Effort**: 2-3 hours  
**Labels**: `testing`, `idempotence`, `validation`

---

### Task 6.5: Add Monitoring and Logging
**Title**: Implement metrics and logging for crawler operations  
**Description**:
- Add logging for:
  - Number of URLs discovered (RSS phase)
  - Number of URLs processed (crawl phase)
  - Number of successes/failures
  - Batch processing stats
- Add structured logging format
- Add error tracking
- Document monitoring setup

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 4.5  
**Effort**: 2-3 hours  
**Labels**: `monitoring`, `logging`, `observability`

---

## Phase 7: Migration & Cleanup

### Task 7.1: Create Migration Script for Existing Data
**Title**: Migrate existing articles from file storage to PostgreSQL  
**Description**:
- Create script to read existing articles from Crawlee storage
- Transform to Article model format
- Insert into PostgreSQL
- Handle duplicates
- Verify migration success
- Document migration process

**Priority**: Low  
**Status**: Todo  
**Dependencies**: Task 4.5  
**Effort**: 3-4 hours  
**Labels**: `migration`, `data`, `one-time`

---

### Task 7.2: Update Documentation
**Title**: Update all documentation for PostgreSQL integration  
**Description**:
- Update README with new setup instructions
- Update architecture documentation
- Update crawler documentation
- Document database schema
- Document environment variables
- Update troubleshooting guide

**Priority**: Medium  
**Status**: Todo  
**Dependencies**: Task 5.5  
**Effort**: 2-3 hours  
**Labels**: `documentation`

---

### Task 7.3: Remove Unused File-Based Storage Code
**Title**: Final cleanup of file storage code  
**Description**:
- Remove unused storage utilities
- Remove storage directory references
- Clean up imports
- Remove unused exports
- Update .gitignore if needed

**Priority**: Low  
**Status**: Todo  
**Dependencies**: Task 5.5  
**Effort**: 1-2 hours  
**Labels**: `cleanup`, `refactor`

---

### Task 7.4: Update .gitignore
**Title**: Update .gitignore for new structure  
**Description**:
- Remove storage/ directory from .gitignore (if no longer needed)
- Add database-related ignores if needed
- Add migration-related ignores
- Verify all necessary files are ignored

**Priority**: Low  
**Status**: Todo  
**Dependencies**: Task 8.3  
**Effort**: 30 minutes  
**Labels**: `git`, `cleanup`

---

### Task 7.5: Final Validation
**Title**: Complete end-to-end validation  
**Description**:
- Run full crawler workflow
- Verify all functionality works
- Verify no file storage dependencies
- Verify database is single source of truth
- Performance testing
- Load testing with larger batches

**Priority**: High  
**Status**: Todo  
**Dependencies**: All previous tasks  
**Effort**: 3-4 hours  
**Labels**: `testing`, `validation`, `e2e`

---

## Summary

**Total Tasks**: 35  
**Estimated Total Effort**: ~70-85 hours  
**Phases**: 7  
**Critical Path**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 6 → Phase 7

**Key Milestones**:
- ✅ Phase 1 Complete: Database foundation ready
- ✅ Phase 2 Complete: RSS writes to PostgreSQL
- ✅ Phase 3 Complete: Crawler pulls from PostgreSQL
- ✅ Phase 4 Complete: Articles stored in PostgreSQL
- ✅ Phase 5 Complete: File storage removed
- ✅ Phase 6 Complete: All validation passed
- ✅ Phase 7 Complete: Migration and cleanup done

