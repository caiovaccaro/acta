# Testing, Health Checks, and Validation Commands

Complete reference for all testing, validation, health check, and diagnostic commands in the Acta platform.

> **📋 See Also:** [TESTING_GAPS_ANALYSIS.md](./TESTING_GAPS_ANALYSIS.md) for a comprehensive analysis of missing tests and health checks across the project.

---

## 1. Unit Tests

### Database Module (`@acta/db`)
```bash
# Run all unit tests
cd modules/db && npm test

# Run tests in watch mode
cd modules/db && npm run test:watch
```
**Test Files:**
- `modules/db/src/__tests__/schema.test.ts` - Database schema tests (health checks, models, relationships)

**What it tests:**
- Database connectivity
- Schema structure (tables, enums, indexes, constraints)
- Model CRUD operations
- Relationships between models

---

### Core Module (`@acta/core`)
```bash
# Run all unit tests
cd modules/core && npm test

# Run tests in watch mode
cd modules/core && npm run test:watch
```
**What it tests:**
- Domain logic
- LLM provider implementations
- Validation frameworks
- Analysis functions

---

### API Module (`@acta/api`)
```bash
# Run all unit tests
cd apps/api && npm test

# Run tests in watch mode
cd apps/api && npm run test:watch
```
**What it tests:**
- API route handlers
- Service layer logic
- Request/response validation

---

### Crawler Module (`@acta/crawler`)
```bash
# Run all unit tests
cd apps/crawler && npm test

# Run tests in watch mode
cd apps/crawler && npm run test:watch
```
**What it tests:**
- Crawler logic
- Content extraction
- RSS feed parsing

---

## 2. Integration Tests

### API Integration Tests
```bash
# Run API integration tests (uses real database)
cd apps/api && npm run test:integration
```
**Test Files:**
- `apps/api/src/__tests__/integration/api.test.ts` - Full API integration tests

**What it tests:**
- HTTP endpoints (`/api/health`, `/api/status`, `/api/topics`, `/api/questions`, etc.)
- Real database interactions
- End-to-end request/response flows
- Error handling

**Prerequisites:**
- Database must be running and accessible
- Environment variables must be configured

---

### Crawler Integration Tests
```bash
# Run crawler integration tests
cd apps/crawler && npm test
```
**Test Files:**
- `apps/crawler/src/__tests__/integration.test.js` - Crawler PostgreSQL integration

**What it tests:**
- Complete crawler flow: RSS → Queue → Processing → Storage
- Database operations (outlets, crawl requests, articles)
- Status transitions
- Data persistence

**Prerequisites:**
- Database must be running and accessible

---

## 3. Type Checking

### TypeScript Type Checking
```bash
# API module
cd apps/api && npm run type-check

# Shared module
cd modules/shared && npm run type-check
```
**What it checks:**
- TypeScript compilation errors
- Type mismatches
- Missing type definitions
- Type safety without running tests

**Note:** This is a static analysis check that doesn't require a running database or services.

---

## 4. Linting

### Web Application Linting
```bash
# Run ESLint on Next.js web app
cd apps/web && npm run lint
```
**What it checks:**
- JavaScript/TypeScript syntax errors
- React best practices
- Next.js conventions
- Code style issues
- Potential bugs

**Configuration:**
- Uses `eslint-config-next` (Next.js recommended rules)
- Includes TypeScript ESLint plugin
- Includes React and React Hooks plugins

---

## 5. Database Health Checks

### Comprehensive Database Health Check
```bash
# Run full database health check
npm run db:health
# or
cd modules/db && npm run db:health
```
**What it checks:**
- ✅ Database connectivity
- ✅ Schema structure:
  - `outlets` table exists
  - `crawl_requests` table exists
  - `articles` table exists
- ✅ Enums (`Ideology`, `CrawlStatus`)
- ✅ Indexes (performance optimization)
- ✅ Constraints (foreign keys, unique constraints)
- ✅ Overall database integrity

**Output:**
- Detailed pass/fail status for each check
- Error messages for any failures
- Exit code 0 on success, 1 on failure

**Use cases:**
- Pre-deployment verification
- Troubleshooting database issues
- Validating migrations
- CI/CD pipeline checks

---

### API Health Endpoint
```bash
# Check API health via HTTP endpoint
curl http://localhost:3001/api/health
```
**What it checks:**
- API server status
- Database connectivity
- Returns JSON with status, timestamp, and database state

**Response format:**
```json
{
  "status": "ok" | "error",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected" | "disconnected"
}
```

**Use cases:**
- Monitoring and alerting
- Load balancer health checks
- Container orchestration (Kubernetes liveness/readiness probes)

---

### API Status Endpoint
```bash
# Get system status
curl http://localhost:3001/api/status
```
**What it returns:**
- Last crawl time
- Last analysis time
- Last verdict calculation time

**Note:** Currently returns placeholder data (TODO: implement actual tracking)

---

## 6. Data Validation

### Bar Question Validation
```bash
# Validate questions for bar conversation suitability
npm run db:validate:bar-questions
# or
cd modules/db && npm run db:validate:bar-questions
```
**What it validates:**
- Questions are simple and conversational
- Questions can be asked in a bar conversation context
- Questions meet readability and clarity standards

**Output:**
- Bar readiness score (0-100) for each question
- Categorization:
  - 🏆 Golden questions (90-100)
  - ✅ Good questions (70-89)
  - ⚠️ Needs improvement (<70)
- Suggested reformulations for questions with score < 90
- Average bar readiness score

**Note:** 
- Only validates questions with `validationStatus: 'validated'` and `isActive: true`
- Reformulations are **suggested only**, not automatically applied
- Requires LLM provider (uses OpenAI to evaluate questions)

**Use cases:**
- Quality assurance for question content
- Identifying questions that need reformulation
- Ensuring questions are accessible to general audience

---

### Revert Bar Reformulations
```bash
# Revert questions reformulated by bar validation
npm run db:revert:bar-reformulations
# or
cd modules/db && npm run db:revert:bar-reformulations
```
**What it does:**
- Finds questions that were reformulated during bar validation
- Reverts them back to their original text (`originalQuestionText`)
- Only affects questions with `barValidation.wasReformulated = true`

**Use cases:**
- Undoing unwanted reformulations
- Restoring original question text
- Testing reformulation impact

---

## 7. Diagnostic & Inspection Commands

### Verdict Reasoning Logging
```bash
# Log all verdict reasoning
npm run db:log:verdict-reasoning

# Log reasoning for specific question
npm run db:log:verdict-reasoning -- --questionId=<id>

# Log reasoning for specific topic
npm run db:log:verdict-reasoning -- --topicId=<id>

# Include article details
npm run db:log:verdict-reasoning -- --include-articles
```
**What it displays:**
- Verdict labels and confidence scores
- Support share and variance
- Reasoning summaries
- Article counts and outlet counts
- Optional: Full article details (titles, URLs, stances)

**Use cases:**
- Debugging verdict calculations
- Understanding why a verdict was reached
- Inspecting article stance distributions
- Quality assurance for LLM-generated reasoning

---

## 8. Test Scripts (Manual Testing)

### Playwright Extraction Test
```bash
# Test Playwright content extraction for a specific URL
cd apps/crawler
node ../../node_modules/tsx/dist/cli.mjs src/scripts/testPlaywrightExtraction.js <url> [outlet]
```
**Example:**
```bash
node ../../node_modules/tsx/dist/cli.mjs src/scripts/testPlaywrightExtraction.js "https://www.wsj.com/articles/example" "Wall Street Journal"
```
**What it tests:**
- Playwright browser extraction
- Content extraction from paywalled sites
- Outlet-specific extraction logic

**Use cases:**
- Debugging extraction issues
- Testing new outlets
- Verifying paywall bypass

---

### Scraper API Parser Test
```bash
# Test ScraperAPI parser
cd apps/crawler
node ../../node_modules/tsx/dist/cli.mjs src/scripts/testScraperAPIParser.js
```
**What it tests:**
- ScraperAPI integration
- Content parsing from ScraperAPI responses

---

## 9. Complete Test Suite Execution

### Run All Tests (All Modules)
```bash
# From project root, run tests for each module
cd modules/db && npm test && \
cd ../core && npm test && \
cd ../../apps/api && npm test && \
cd ../crawler && npm test
```

### Run All Type Checks
```bash
cd apps/api && npm run type-check && \
cd ../../modules/shared && npm run type-check
```

### Run All Linting
```bash
cd apps/web && npm run lint
```

---

## 10. Pre-Deployment Checklist

### Complete Validation Before Deployment
```bash
# 1. Type checking
cd apps/api && npm run type-check
cd ../web && npm run lint

# 2. Database health check
npm run db:health

# 3. Unit tests
cd modules/db && npm test
cd ../core && npm test
cd ../../apps/api && npm test

# 4. Integration tests
cd apps/api && npm run test:integration

# 5. API health endpoint
curl http://localhost:3001/api/health
```

---

## 11. Continuous Integration (CI) Commands

### Recommended CI Pipeline
```bash
# Install dependencies
npm install

# Type checking
cd apps/api && npm run type-check
cd ../web && npm run lint

# Database health check
npm run db:health

# Unit tests
cd modules/db && npm test
cd ../core && npm test
cd ../../apps/api && npm test
cd ../crawler && npm test

# Integration tests (requires database)
cd apps/api && npm run test:integration
```

---

## Quick Reference Table

| Category | Command | Module | Requires DB | Requires Services |
|----------|---------|--------|-------------|-------------------|
| **Unit Tests** | `npm test` | All modules | ✅ | ❌ |
| **Integration Tests** | `npm run test:integration` | `apps/api` | ✅ | ✅ |
| **Type Check** | `npm run type-check` | `apps/api`, `modules/shared` | ❌ | ❌ |
| **Lint** | `npm run lint` | `apps/web` | ❌ | ❌ |
| **DB Health** | `npm run db:health` | `modules/db` | ✅ | ❌ |
| **API Health** | `curl /api/health` | `apps/api` | ✅ | ✅ |
| **Bar Validation** | `npm run db:validate:bar-questions` | `modules/db` | ✅ | ✅ (LLM) |
| **Verdict Logging** | `npm run db:log:verdict-reasoning` | `modules/db` | ✅ | ❌ |

---

## Notes

- **Database Required:** Most commands require a running PostgreSQL database with proper connection configuration in `.env`
- **LLM Required:** Bar question validation requires OpenAI API key configured
- **Watch Mode:** Use `npm run test:watch` for development to automatically rerun tests on file changes
- **Exit Codes:** Health checks and tests return exit code 0 on success, 1 on failure (useful for CI/CD)
- **Test Isolation:** Integration tests may create test data; cleanup is handled in `afterAll` hooks
- **Environment:** Ensure `.env` file is properly configured before running tests that require database or API access

