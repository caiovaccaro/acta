# Crawler PostgreSQL Integration - Task Planning

This directory contains the implementation plan and task breakdown for integrating PostgreSQL into the crawler.

## Files

- **IMPLEMENTATION_PLAN.md** - High-level implementation plan with phases and overview
- **LINEAR_TASKS.md** - Detailed task descriptions formatted for manual Linear task creation
- **LINEAR_TASKS_IMPORT.csv** - CSV format for bulk import into Linear (if supported)

## Quick Start

### Option 1: Import CSV to Linear (Recommended if supported)

1. Open Linear and navigate to your project
2. Use Linear's CSV import feature (if available)
3. Import `LINEAR_TASKS_IMPORT.csv`
4. Review and adjust tasks as needed
5. Link tasks to parent issue: "Crawler PostgreSQL Integration"

### Option 2: Manual Task Creation

1. Open `LINEAR_TASKS.md`
2. For each task:
   - Create a new Linear task
   - Copy the title as the task name
   - Copy the description into the task description
   - Set priority based on the task priority
   - Add labels from the task labels
   - Set estimate based on effort hours
   - Link dependencies to previous tasks
   - Assign to appropriate phase/milestone

## Task Organization

Tasks are organized into **7 phases**:

1. **Phase 1: Database Foundation** (7 tasks) - Set up PostgreSQL and Prisma
2. **Phase 2: RSS → PostgreSQL Queue** (5 tasks) - Move RSS discovery to DB
3. **Phase 3: Crawler → PostgreSQL Batch Processing** (5 tasks) - Pull work from DB
4. **Phase 4: Persist Results to PostgreSQL** (5 tasks) - Store articles in DB
5. **Phase 5: Remove File-Based Storage** (5 tasks) - Clean up old storage
6. **Phase 6: Validation & Testing** (5 tasks) - Comprehensive testing
7. **Phase 7: Migration & Cleanup** (5 tasks) - Final cleanup

**Total: 35 tasks**

## Critical Path

Tasks must be completed in phase order:
- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 6 → Phase 7
- Phase 5 can run in parallel with Phase 4

## Estimated Timeline

- **Total Effort**: ~70-85 hours
- **With 1 developer**: ~2-3 weeks (full-time)
- **With 2 developers**: ~1-1.5 weeks (parallel phases)

## Dependencies

**Prerequisites**:
- PostgreSQL instance (local or Docker)
- Prisma ORM knowledge
- Understanding of current crawler architecture

**Blocking Dependencies**:
- Phase 1 must complete before any other phase
- Each phase generally depends on the previous phase
- See individual task dependencies in LINEAR_TASKS.md

## Success Criteria

After all tasks complete:
- ✅ RSS feeds write to PostgreSQL CrawlRequest table
- ✅ Crawler pulls batches from PostgreSQL
- ✅ Articles stored in PostgreSQL Article table
- ✅ No file-based storage dependencies
- ✅ Idempotent execution (safe to re-run)
- ✅ Proper status tracking throughout workflow

## Notes

- All tasks follow the constitution principles
- Tasks are designed to be independently testable where possible
- Each phase can be validated before moving to the next
- File-based storage should be kept as backup during migration

