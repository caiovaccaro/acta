# Testing & Health Check Gaps Analysis

This document identifies parts of the Acta platform that are missing testing layers, health checks, or validation mechanisms.

---

## Summary

| Module/App | Unit Tests | Integration Tests | Health Checks | Type Checks | Linting | Status |
|------------|-----------|-------------------|---------------|-------------|--------|--------|
| **modules/db** | ✅ | ❌ | ✅ | ✅ | ❌ | **Good** |
| **modules/core** | ❌ | ❌ | ❌ | ✅ | ❌ | **⚠️ Missing Tests** |
| **modules/shared** | ❌ | ❌ | ❌ | ✅ | ❌ | **⚠️ Missing Tests** |
| **modules/config** | ❌ | ❌ | ❌ | ✅ | ❌ | **⚠️ Missing Tests** |
| **apps/api** | ❌ | ✅ | ✅ | ✅ | ❌ | **⚠️ Missing Unit Tests** |
| **apps/web** | ❌ | ❌ | ❌ | ✅ | ✅ | **⚠️ Missing Tests** |
| **apps/admin** | ❌ | ❌ | ❌ | ✅ | ❌ | **⚠️ Missing Tests** |
| **apps/crawler** | ❌ | ✅ | ❌ | ✅ | ❌ | **⚠️ Missing Unit Tests** |

---

## Critical Gaps

### 1. **Web Application (`apps/web`)** - ⚠️ **HIGH PRIORITY**

**Missing:**
- ❌ No unit tests for React components
- ❌ No integration tests for pages/routes
- ❌ No component testing (React Testing Library)
- ❌ No E2E tests (Playwright/Cypress)
- ❌ No health check endpoint
- ❌ No visual regression tests

**What Should Be Tested:**
- React components (`QuestionCard`, `TopicCard`, `FeaturedQuestionCard`, `NextCause`, `Header`, `Footer`)
- Custom hooks (`useQuestions`, `useTopics`, `useVerdict`, `useDebateCard`, etc.)
- Page components (`Home`, `QuestionDetail`, `TopicDetail`)
- API client integration
- Navigation and routing
- Responsive design behavior
- Error boundaries and error states
- Loading states

**Recommendations:**
```bash
# Add to apps/web/package.json:
"test": "jest",
"test:watch": "jest --watch",
"test:e2e": "playwright test",
"test:visual": "percy snapshot"
```

**Test Libraries to Add:**
- `@testing-library/react` - Component testing
- `@testing-library/jest-dom` - DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `jest` - Test runner
- `@playwright/test` - E2E testing
- `msw` (Mock Service Worker) - API mocking

---

### 2. **Core Module (`modules/core`)** - ⚠️ **HIGH PRIORITY**

**Missing:**
- ❌ No unit tests despite having test scripts configured
- ❌ No tests for LLM provider implementations
- ❌ No tests for analysis functions (stance classification, verdict calculation)
- ❌ No tests for validation framework
- ❌ No tests for topic/question discovery logic

**What Should Be Tested:**
- `LLMProvider` interface implementations (`OpenAIProvider`)
- Analysis functions:
  - `stanceClassifier.ts` - Article stance classification
  - `verdictCalculator.ts` - Verdict calculation logic
  - `questionMatcher.ts` - Question matching
  - `topicMatcher.ts` - Topic matching
- Validation framework:
  - `ValidationFramework` class
  - `barQuestionValidator.ts` - Bar question validation
- Discovery functions:
  - `topicDiscovery.ts` - Topic discovery from articles
  - `questionDiscovery.ts` - Question discovery
- Utility functions:
  - `monthPeriod.ts` - Date period calculations
  - Retry logic in `llm/utils/retry.ts`

**Recommendations:**
```bash
# Create jest.config.js for modules/core
# Add test files:
- src/__tests__/llm/openaiProvider.test.ts
- src/__tests__/analysis/stanceClassifier.test.ts
- src/__tests__/analysis/verdictCalculator.test.ts
- src/__tests__/validation/framework.test.ts
- src/__tests__/validation/barQuestionValidator.test.ts
```

**Test Libraries Needed:**
- `jest` - Already configured
- `ts-jest` - Already configured
- Mock OpenAI API responses for LLM tests

---

### 3. **Admin Application (`apps/admin`)** - ⚠️ **MEDIUM PRIORITY**

**Missing:**
- ❌ No unit tests
- ❌ No integration tests
- ❌ No health check endpoint
- ❌ No API endpoint tests
- ❌ No authentication/authorization tests

**What Should Be Tested:**
- Express server setup
- Admin routes (topic/question management)
- Database operations
- Form validation
- Error handling
- Authentication middleware (if implemented)

**Recommendations:**
```bash
# Add to apps/admin/package.json:
"test": "jest",
"test:watch": "jest --watch",
"test:integration": "jest --testPathPattern=integration"
```

**Test Libraries to Add:**
- `jest` - Test runner
- `supertest` - HTTP endpoint testing
- `@types/jest` - TypeScript support

---

### 4. **API Module (`apps/api`)** - ⚠️ **MEDIUM PRIORITY**

**Missing:**
- ❌ No unit tests for service layer
- ❌ No unit tests for route handlers
- ❌ No unit tests for middleware
- ✅ Has integration tests (good!)

**What Should Be Tested:**
- Service layer (`topicsService`, `questionsService`, `debateService`, etc.)
- Route handlers (request/response validation)
- Middleware (`errorHandler`, `logger`)
- Utility functions (`llmProvider.ts`)
- Error handling and edge cases

**Recommendations:**
```bash
# Add unit tests alongside integration tests:
- src/__tests__/services/topicsService.test.ts
- src/__tests__/services/questionsService.test.ts
- src/__tests__/routes/topics.test.ts
- src/__tests__/middleware/errorHandler.test.ts
```

---

### 5. **Crawler Module (`apps/crawler`)** - ⚠️ **MEDIUM PRIORITY**

**Missing:**
- ❌ No unit tests for individual components
- ✅ Has integration tests (good!)
- ❌ No health check endpoint

**What Should Be Tested:**
- RSS feed parsing
- Content extractors (`PlaywrightExtractor`)
- Crawler implementations
- Article processing pipeline
- Error handling and retries
- Rate limiting logic

**Recommendations:**
```bash
# Add unit tests:
- src/__tests__/rss/feedParser.test.js
- src/__tests__/extractors/playwrightExtractor.test.js
- src/__tests__/crawlers/*.test.js
```

---

### 6. **Shared Module (`modules/shared`)** - ⚠️ **LOW PRIORITY**

**Missing:**
- ❌ No tests for DTO validation
- ❌ No tests for type exports

**What Should Be Tested:**
- DTO structure validation
- Type exports correctness
- Interface contracts

**Note:** This is lower priority as it's primarily type definitions, but runtime validation tests could be useful.

---

### 7. **Config Module (`modules/config`)** - ⚠️ **LOW PRIORITY**

**Missing:**
- ❌ Only has placeholder test script
- ❌ No actual tests

**What Should Be Tested:**
- Environment variable validation
- Configuration loading
- Default value handling
- Error handling for missing/invalid config

---

## Health Check Gaps

### Missing Health Endpoints

1. **Web Application (`apps/web`)**
   - ❌ No `/health` endpoint
   - ❌ No readiness/liveness probes
   - **Impact:** Cannot monitor web app health in production

2. **Admin Application (`apps/admin`)**
   - ❌ No `/health` endpoint
   - ❌ No readiness/liveness probes
   - **Impact:** Cannot monitor admin app health in production

3. **Crawler (`apps/crawler`)**
   - ❌ No health check script or endpoint
   - ❌ No way to verify crawler is functioning
   - **Impact:** Difficult to diagnose crawler issues

### Recommended Health Checks

**Web App:**
```typescript
// apps/web/app/api/health/route.ts
export async function GET() {
  // Check API connectivity
  // Check database (via API)
  return Response.json({ status: 'ok', timestamp: new Date() });
}
```

**Admin App:**
```typescript
// apps/admin/src/routes/health.ts
router.get('/health', async (req, res) => {
  // Check database connectivity
  // Check admin permissions
  res.json({ status: 'ok', timestamp: new Date() });
});
```

**Crawler:**
```javascript
// apps/crawler/src/scripts/healthCheck.js
// Check database connectivity
// Check RSS feed accessibility
// Check storage availability
```

---

## Testing Infrastructure Gaps

### Missing Test Utilities

1. **Test Fixtures/Helpers**
   - ❌ No shared test utilities
   - ❌ No mock data factories
   - ❌ No database seeding for tests

2. **Test Coverage**
   - ❌ No coverage reporting configured (except crawler)
   - ❌ No coverage thresholds
   - ❌ No CI/CD coverage checks

3. **E2E Testing**
   - ❌ No end-to-end test suite
   - ❌ No visual regression testing
   - ❌ No accessibility testing

4. **Performance Testing**
   - ❌ No load testing
   - ❌ No stress testing
   - ❌ No performance benchmarks

---

## Priority Recommendations

### 🔴 **Critical (Do First)**
1. **Add unit tests to `modules/core`**
   - Most critical business logic lives here
   - LLM provider, analysis, and validation need testing

2. **Add tests to `apps/web`**
   - User-facing application needs reliability
   - Component and hook testing essential

### 🟡 **High Priority (Do Soon)**
3. **Add unit tests to `apps/api` service layer**
   - Complement existing integration tests
   - Test business logic in isolation

4. **Add health checks to `apps/web` and `apps/admin`**
   - Essential for production monitoring
   - Required for container orchestration

### 🟢 **Medium Priority (Do Later)**
5. **Add unit tests to `apps/crawler`**
   - Test individual components
   - Improve maintainability

6. **Add tests to `apps/admin`**
   - Ensure admin functionality works correctly

### ⚪ **Low Priority (Nice to Have)**
7. **Add tests to `modules/shared` and `modules/config`**
   - Lower risk areas
   - Can be added incrementally

---

## Quick Wins

### Immediate Actions (1-2 days each)

1. **Add health endpoint to web app** (2 hours)
   ```typescript
   // apps/web/app/api/health/route.ts
   export async function GET() {
     return Response.json({ status: 'ok' });
   }
   ```

2. **Add health endpoint to admin app** (2 hours)
   ```typescript
   // apps/admin/src/routes/health.ts
   router.get('/health', (req, res) => {
     res.json({ status: 'ok' });
   });
   ```

3. **Add basic unit tests to core module** (1 day)
   - Start with utility functions
   - Add LLM provider mocks
   - Test validation framework

4. **Add component tests to web app** (1-2 days)
   - Start with simple components (`Header`, `Footer`)
   - Add hook tests (`useQuestions`, `useTopics`)
   - Use React Testing Library

---

## Test Coverage Goals

| Module/App | Current | Target | Priority |
|------------|---------|--------|----------|
| `modules/core` | 0% | 80% | 🔴 Critical |
| `apps/web` | 0% | 70% | 🔴 Critical |
| `apps/api` | ~30% (integration only) | 80% | 🟡 High |
| `apps/admin` | 0% | 60% | 🟢 Medium |
| `apps/crawler` | ~20% (integration only) | 70% | 🟢 Medium |
| `modules/db` | ~40% | 80% | 🟡 High |
| `modules/shared` | 0% | 50% | ⚪ Low |
| `modules/config` | 0% | 50% | ⚪ Low |

---

## Notes

- **Integration tests are valuable** but should be complemented with unit tests for faster feedback
- **Health checks are essential** for production monitoring and container orchestration
- **Start with critical paths** - test the most important business logic first
- **Incremental approach** - add tests as you work on features
- **Mock external dependencies** - LLM APIs, databases, etc. for unit tests
- **Use test utilities** - create shared helpers to reduce duplication



