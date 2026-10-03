> Historical plan. Public HTTP is Next.js `apps/web/app/api/*`, not a standalone Fastify server. See `apps/api/README.md`.

# RESTful API & Frontend Integration Plan

**Feature**: RESTful API Layer & Frontend Integration  
**Date**: 2025-01-17  
**Status**: Planning

## Overview

This plan outlines the implementation of a RESTful API layer (`apps/api`) to serve the frontend application (`apps/web`), replacing mocked data with real backend data. The frontend will fetch fresh data on page load/navigation, reflecting the latest state from backend processes (crawler, analysis pipeline, verdict calculation).

## Current State

### Backend
- ✅ Database schema with Topics, Questions, Verdicts, Article Stances, Outlets, Articles
- ✅ Analysis pipeline (`apps/crawler/src/scripts/runAnalysisPipeline.js`)
- ✅ Verdict calculation (`modules/core/src/analysis/verdictService.ts`)
- ✅ Admin UI (`apps/web/app/admin`) for moderation
- ✅ Repositories in `modules/db/src/repositories/`

### Frontend (Expected)
- Next.js 14 application in `apps/web`
- Mocked data structures for:
  - Topics list
  - Verdict Cards (question, verdict label, confidence, reasoning)
  - Consensus Thermometer (outlet stances by publication)
  - Debate Cards (arguments for/against, unknowns)
  - Transparency Panel (outlets, credibility scores)
  - Pick Your Cause Wizard (recommendations)

## Architecture Decisions

### API Framework
- **Fastify** (as per existing architecture docs)
- TypeScript with strict mode
- RESTful conventions
- JSON request/response format

### Data Flow
```
Backend Processes → Database → API Layer → Frontend
  (Crawler, Analysis, Verdicts)
```

### Update Strategy
- **Data Refresh**: Frontend fetches fresh data on page load/navigation (no auto-refresh/polling)
- **Future Enhancement**: Optional real-time updates via Server-Sent Events (SSE) or WebSockets if needed

### Data Transformation
- Repository layer returns Prisma models
- API services transform to DTOs (Data Transfer Objects)
- DTOs defined in `modules/shared/src/dto/` (shared between API and Frontend)

---

## Phase 1: RESTful API Layer

### Goals
1. Build Fastify API server in `apps/api`
2. Implement core endpoints for all frontend features
3. Transform database models to API-friendly DTOs
4. Add health checks and error handling
5. Support polling-based updates

### 1.1 Project Setup

**Location**: `apps/api/`

**Structure**:
```
apps/api/
  src/
    index.ts              # Entry point
    server.ts             # Fastify server setup
    routes/
      topics.ts           # GET /api/topics, GET /api/topics/:id
      verdicts.ts         # GET /api/verdicts/:questionId, GET /api/verdicts/:questionId/current
      consensus.ts        # GET /api/consensus/:questionId/thermometer
      debate.ts           # GET /api/debate/:questionId
      transparency.ts     # GET /api/transparency/outlets
      feedback.ts         # POST /api/feedback
      health.ts           # GET /api/health
    services/
      topicsService.ts    # Business logic for topics
      verdictsService.ts  # Business logic for verdicts
      consensusService.ts # Consensus thermometer calculations
      debateService.ts    # Debate card synthesis
      transparencyService.ts # Outlet transparency data
    middleware/
      errorHandler.ts     # Global error handler
      cors.ts             # CORS configuration
      logger.ts           # Request logging
    types/
      api.ts              # API-specific types
  package.json
  tsconfig.json
```

**Dependencies**:
- `fastify` - Web framework
- `@acta/db` - Database access
- `@acta/core` - Domain logic
- `@acta/shared` - Shared DTOs (to be created)

### 1.2 Shared DTOs Module

**Location**: `modules/shared/src/dto/`

**Purpose**: Define data contracts between API and Frontend

**Structure**:
```
modules/shared/
  src/
    dto/
      topics.dto.ts
      verdicts.dto.ts
      consensus.dto.ts
      debate.dto.ts
      transparency.dto.ts
      feedback.dto.ts
      common.dto.ts       # Pagination, errors, etc.
    index.ts
  package.json
  tsconfig.json
```

**Key DTOs**:

```typescript
// topics.dto.ts
export interface TopicDTO {
  id: string;
  name: string;
  description: string | null;
  safetyNoteRequired: boolean;
  questionCount: number;
  activeQuestionCount: number;
  createdAt: string;
}

export interface TopicDetailDTO extends TopicDTO {
  questions: QuestionSummaryDTO[];
}

export interface QuestionSummaryDTO {
  id: string;
  questionText: string;
  isActive: boolean;
  verdict?: VerdictSummaryDTO | null;
}

// verdicts.dto.ts
export interface VerdictDTO {
  id: string;
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  month: string; // ISO date string (YYYY-MM-01)
  verdictLabel: 'YesItSeemsSo' | 'ProbablyYes' | 'Unclear' | 'ProbablyNot' | 'NoItDoesntSeemSo';
  confidence: number; // 0-100
  supportShare: number; // 0-1
  variance: number; // 0-1
  reasoning: string | null;
  articleCount: number;
  outletCount: number;
  calculatedAt: string;
}

export interface VerdictCardDTO extends VerdictDTO {
  evidenceBullets: EvidenceBulletDTO[];
  scopeNote: ScopeNoteDTO;
  safetyNote?: string | null;
}

export interface EvidenceBulletDTO {
  id: string;
  text: string;
  type: 'Why' | 'Dissent' | 'Unknowns';
  articleId: string | null;
  articleTitle: string | null;
  articleUrl: string | null;
  outletName: string | null;
  order: number;
}

export interface ScopeNoteDTO {
  articleCount: number;
  outletCount: number;
  dateRange: {
    start: string;
    end: string;
  };
}

// consensus.dto.ts
export interface ConsensusThermometerDTO {
  questionId: string;
  questionText: string;
  month: string;
  outletStances: OutletStanceDTO[]; // Grouped by publication/outlet
  stanceSummary: {
    stance: 'YesItSeemsSo' | 'ProbablyYes' | 'Unclear' | 'ProbablyNot' | 'NoItDoesntSeemSo';
    outletCount: number; // Number of outlets with this stance
    weightedSupport: number; // Weighted by outlet credibility (0-1)
  }[];
}

export interface OutletStanceDTO {
  outletId: string;
  outletName: string;
  credibilityScore: number;
  stance: 'YesItSeemsSo' | 'ProbablyYes' | 'Unclear' | 'ProbablyNot' | 'NoItDoesntSeemSo';
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  reasoning: string | null;
  weightedContribution: number; // This outlet's contribution to the verdict (weighted by credibility)
}

// debate.dto.ts
export interface DebateCardDTO {
  questionId: string;
  questionText: string;
  topicId: string;
  topicName: string;
  overview: string; // 6-10 line neutral summary
  argumentsFor: ArgumentDTO[];
  argumentsAgainst: ArgumentDTO[];
  unknowns: UnknownDTO[];
  sources: SourceCitationDTO[];
}

export interface ArgumentDTO {
  id: string;
  text: string;
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  outletName: string;
  ideology: 'Left' | 'Center' | 'Right';
}

export interface UnknownDTO {
  id: string;
  text: string;
  articleId: string | null;
}

export interface SourceCitationDTO {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  outletName: string;
  ideology: 'Left' | 'Center' | 'Right';
  publishedDate: string | null;
}

// transparency.dto.ts
export interface TransparencyDTO {
  outlets: OutletTransparencyDTO[];
  methodology: MethodologyDTO;
}

export interface OutletTransparencyDTO {
  id: string;
  name: string;
  ideology: 'Left' | 'Center' | 'Right';
  credibilityScore: number;
  credibilityBreakdown: {
    externalTrust: number; // 0-1
    transparency: number; // 0-1
  };
  articleCount: number;
  contributionCount: number; // Number of article stances
}

export interface MethodologyDTO {
  verdictCalculation: string;
  credibilityScoring: string;
  stanceClassification: string;
  updateFrequency: string;
}

// feedback.dto.ts
export interface FeedbackCreateDTO {
  verdictId: string;
  type: 'useful' | 'biased' | 'inaccurate';
  notes?: string | null;
}

export interface FeedbackDTO extends FeedbackCreateDTO {
  id: string;
  createdAt: string;
}

// common.dto.ts
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### 1.3 API Endpoints

#### Topics

**GET `/api/topics`**
- List all approved topics
- Query params: `?includeInactive=false`
- Response: `PaginatedResponse<TopicDTO>`

**GET `/api/topics/:id`**
- Get topic details with questions
- Response: `TopicDetailDTO`

**GET `/api/topics/:id/verdict`**
- Get current verdict for topic's active question
- Response: `VerdictCardDTO | null`

#### Verdicts

**GET `/api/verdicts/:questionId`**
- Get all monthly verdicts for a question
- Query params: `?limit=12` (last 12 months)
- Response: `VerdictDTO[]`

**GET `/api/verdicts/:questionId/current`**
- Get current month's verdict for a question
- Response: `VerdictCardDTO | null`

**GET `/api/verdicts/:questionId/:month`**
- Get specific month's verdict
- Month format: `YYYY-MM` (e.g., `2025-01`)
- Response: `VerdictCardDTO | null`

#### Consensus Thermometer

**GET `/api/consensus/:questionId/thermometer`**
- Get consensus breakdown by publication/outlet for current month
- Query params: `?month=2025-01` (optional, defaults to current)
- Response: `ConsensusThermometerDTO`

#### Debate Card

**GET `/api/debate/:questionId`**
- Get debate card data (arguments, unknowns, overview)
- Query params: `?month=2025-01` (optional)
- Response: `DebateCardDTO`

#### Transparency

**GET `/api/transparency/outlets`**
- Get all outlets with credibility scores
- Query params: `?ideology=Left|Center|Right` (filter)
- Response: `TransparencyDTO`

**GET `/api/transparency/methodology`**
- Get methodology explanation
- Response: `MethodologyDTO`

#### Feedback

**POST `/api/feedback`**
- Submit feedback on a verdict
- Body: `FeedbackCreateDTO`
- Response: `FeedbackDTO`

**GET `/api/feedback`** (Admin only, future)
- List feedback (pagination, filtering)

#### Health & Status

**GET `/api/health`**
- Health check endpoint
- Response: `{ status: 'ok', timestamp: string, database: 'connected' | 'disconnected' }`

**GET `/api/status`**
- System status (last crawl, last analysis, last verdict calculation)
- Response: `{ lastCrawl: string | null, lastAnalysis: string | null, lastVerdictCalculation: string | null }`

### 1.4 Service Layer Implementation

**Location**: `apps/api/src/services/`

**Responsibilities**:
- Transform Prisma models to DTOs
- Aggregate data from multiple repositories
- Calculate derived fields (e.g., `articleCount`, `outletCount`)
- Handle business logic (e.g., "current month" resolution)

**Key Services**:

1. **`topicsService.ts`**
   - `getAllTopics(includeInactive: boolean): Promise<TopicDTO[]>`
   - `getTopicById(id: string): Promise<TopicDetailDTO>`
   - `getTopicVerdict(topicId: string): Promise<VerdictCardDTO | null>`

2. **`verdictsService.ts`**
   - `getVerdictByQuestionId(questionId: string, month?: string): Promise<VerdictCardDTO | null>`
   - `getVerdictHistory(questionId: string, limit: number): Promise<VerdictDTO[]>`
   - `getCurrentVerdict(questionId: string): Promise<VerdictCardDTO | null>`

3. **`consensusService.ts`**
   - `getConsensusThermometer(questionId: string, month?: string): Promise<ConsensusThermometerDTO>`
   - Aggregates `ArticleStance` by outlet/publication, weighted by credibility
   - Groups outlets by their stance, showing each publication's position

4. **`debateService.ts`**
   - `getDebateCard(questionId: string, month?: string): Promise<DebateCardDTO>`
   - Synthesizes arguments from `ArticleStance.reasoning`
   - Groups by stance (for/against)

5. **`transparencyService.ts`**
   - `getTransparencyData(ideology?: string): Promise<TransparencyDTO>`
   - Aggregates outlet contributions from `ArticleStance`

### 1.5 Data Transformation Logic

**Repository → Service → DTO Flow**:

```typescript
// Example: verdictsService.ts
async function getVerdictCard(questionId: string, month?: string): Promise<VerdictCardDTO | null> {
  // 1. Fetch verdict from repository
  const verdict = await verdictRepository.findVerdictByQuestionAndMonth(questionId, month);
  if (!verdict) return null;

  // 2. Fetch related data
  const question = await questionRepository.findById(questionId);
  const topic = await topicRepository.findById(question.topicId);
  const evidenceBullets = await evidenceBulletRepository.findByVerdictId(verdict.id);
  const stances = await articleStanceRepository.findByQuestionId(questionId);

  // 3. Aggregate counts
  const articleCount = new Set(stances.map(s => s.articleId)).size;
  const outletIds = await Promise.all(
    stances.map(s => articleRepository.findById(s.articleId))
  );
  const outletCount = new Set(outletIds.map(a => a.outletId)).size;

  // 4. Transform to DTO
  return {
    id: verdict.id,
    questionId: question.id,
    questionText: question.questionText,
    topicId: topic.id,
    topicName: topic.name,
    month: verdict.month.toISOString(),
    verdictLabel: verdict.verdictLabel,
    confidence: verdict.confidence,
    supportShare: verdict.supportShare,
    variance: verdict.variance,
    reasoning: verdict.reasoning,
    articleCount,
    outletCount,
    calculatedAt: verdict.calculatedAt.toISOString(),
    evidenceBullets: evidenceBullets.map(eb => ({
      id: eb.id,
      text: eb.text,
      type: eb.type,
      articleId: eb.articleId,
      articleTitle: eb.article?.title || null,
      articleUrl: eb.article?.url || null,
      outletName: eb.article?.outlet.name || null,
      order: eb.order,
    })),
    scopeNote: {
      articleCount,
      outletCount,
      dateRange: {
        start: getMonthStart(verdict.month).toISOString(),
        end: getMonthEnd(verdict.month).toISOString(),
      },
    },
    safetyNote: topic.safetyNoteRequired ? getSafetyNote(topic.name) : null,
  };
}
```

### 1.6 Error Handling & Validation

**Middleware**: `apps/api/src/middleware/errorHandler.ts`

- Catch all errors
- Transform Prisma errors to API errors
- Return consistent `ErrorResponse` format
- Log errors for debugging

**Validation**: Use Fastify plugins (`@fastify/type-provider-typebox` or `zod`)

- Validate request params, query, body
- Return 400 for invalid input
- Return 404 for not found
- Return 500 for server errors

### 1.7 Testing Strategy

**Unit Tests**:
- Service layer transformations
- DTO validation
- Error handling

**Integration Tests**:
- Endpoint responses
- Database queries
- Error scenarios

**Test Data**:
- Seed script for test database
- Mock repositories (optional)

---

## Phase 2: Frontend Integration

### Goals
1. Replace mocked data with API calls
2. Fetch fresh data on page load/navigation
3. Add loading states and error handling
4. Optimize data fetching (caching, deduplication)
5. Support manual refresh if needed

### 2.1 API Client Setup

**Location**: `apps/web/lib/apiClient.ts`

**Implementation**:
```typescript
// apiClient.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    return response.json();
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();
```

### 2.2 Data Fetching Hooks

**Location**: `apps/web/lib/hooks/`

**React Query / SWR Integration**:
- Use `@tanstack/react-query` or `swr` for caching and data fetching
- Implement custom hooks for each data type
- Data refreshes on page load/navigation (no auto-polling)

**Example Hooks**:
```typescript
// hooks/useTopics.ts
export function useTopics(includeInactive = false) {
  return useQuery({
    queryKey: ['topics', includeInactive],
    queryFn: () => apiClient.get<PaginatedResponse<TopicDTO>>('/topics', { includeInactive: String(includeInactive) }),
    staleTime: 0, // Always fetch fresh data on mount
  });
}

// hooks/useVerdict.ts
export function useVerdict(questionId: string, month?: string) {
  return useQuery({
    queryKey: ['verdict', questionId, month],
    queryFn: () => apiClient.get<VerdictCardDTO>(`/verdicts/${questionId}${month ? `/${month}` : '/current'}`),
    staleTime: 0, // Always fetch fresh data on mount
  });
}

// hooks/useConsensusThermometer.ts
export function useConsensusThermometer(questionId: string, month?: string) {
  return useQuery({
    queryKey: ['consensus', questionId, month],
    queryFn: () => apiClient.get<ConsensusThermometerDTO>(`/consensus/${questionId}/thermometer`, month ? { month } : undefined),
    staleTime: 0, // Always fetch fresh data on mount
  });
}
```

### 2.3 Component Updates

**Replace Mock Data**:

1. **Homepage** (`apps/web/app/page.tsx`)
   - Replace mocked topics with `useTopics()`
   - Show loading states
   - Handle errors

2. **Verdict Card** (`apps/web/components/VerdictCard.tsx`)
   - Use `useVerdict(questionId)`
   - Display loading skeleton
   - Show error message if verdict not found

3. **Consensus Thermometer** (`apps/web/components/ConsensusThermometer.tsx`)
   - Use `useConsensusThermometer(questionId)`
   - Update visualization on data change

4. **Debate Card** (`apps/web/components/DebateCard.tsx`)
   - Use `useDebateCard(questionId)`
   - Render arguments, unknowns, sources

5. **Transparency Panel** (`apps/web/components/TransparencyTable.tsx`)
   - Use `useTransparency(ideology?)`
   - Filter by ideology

6. **Pick Your Cause Wizard** (`apps/web/components/PickYourCauseWizard.tsx`)
   - Use `useTopics()` for recommendations
   - Submit feedback via `apiClient.post('/feedback', data)`

### 2.4 Data Refresh Strategy

**Implementation**:
- Data fetches fresh on page load/navigation
- React Query/SWR handles caching and deduplication
- Manual refresh available via `refetch()` if needed

**Optimization**:
- Cache responses during navigation (React Query default)
- Deduplicate simultaneous requests for same data
- Show cached data immediately while fetching fresh data (stale-while-revalidate pattern)

### 2.5 Loading & Error States

**Loading States**:
- Skeleton loaders for cards
- Spinner for lists
- Progressive loading (show cached data while fetching)

**Error States**:
- Display user-friendly error messages
- Retry buttons
- Fallback to cached data if available

### 2.6 Manual Refresh (Optional)

**Implementation**:
- Add "Refresh" button in UI if needed
- Use React Query's `refetch()` method
- Show loading state during refresh

**Future Enhancement**: Real-time updates via Server-Sent Events (SSE) or WebSockets if needed in the future.

---

## Implementation Checklist

### Phase 1: API Layer

- [ ] Create `apps/api` project structure
- [ ] Set up Fastify server with TypeScript
- [ ] Create `modules/shared` with DTOs
- [ ] Implement health check endpoint
- [ ] Implement topics endpoints (`GET /api/topics`, `GET /api/topics/:id`)
- [ ] Implement verdicts endpoints (`GET /api/verdicts/:questionId`, `GET /api/verdicts/:questionId/current`)
- [ ] Implement consensus thermometer endpoint (`GET /api/consensus/:questionId/thermometer`)
- [ ] Implement debate card endpoint (`GET /api/debate/:questionId`)
- [ ] Implement transparency endpoints (`GET /api/transparency/outlets`)
- [ ] Implement feedback endpoint (`POST /api/feedback`)
- [ ] Add error handling middleware
- [ ] Add request validation
- [ ] Add CORS configuration
- [ ] Write unit tests for services
- [ ] Write integration tests for endpoints
- [ ] Document API with OpenAPI/Swagger (optional)

### Phase 2: Frontend Integration

- [ ] Set up API client in `apps/web/lib/apiClient.ts`
- [ ] Install React Query or SWR
- [ ] Create data fetching hooks (`useTopics`, `useVerdict`, etc.)
- [ ] Update Homepage to use real data
- [ ] Update VerdictCard component
- [ ] Update ConsensusThermometer component
- [ ] Update DebateCard component
- [ ] Update TransparencyTable component
- [ ] Update PickYourCauseWizard component
- [ ] Add loading states (skeletons, spinners)
- [ ] Add error handling and retry logic
- [ ] Test end-to-end data flow
- [ ] Verify data refreshes on page navigation
- [ ] Optimize bundle size and API calls
- [ ] Add TypeScript types from shared DTOs

---

## Environment Variables

### API (`apps/api/.env`)
```
PORT=3001
DATABASE_URL=postgresql://...
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### Frontend (`apps/web/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## Dependencies

### API (`apps/api/package.json`)
```json
{
  "dependencies": {
    "fastify": "^4.24.0",
    "@acta/db": "file:../../modules/db",
    "@acta/core": "file:../../modules/core",
    "@acta/shared": "file:../../modules/shared"
  }
}
```

### Frontend (`apps/web/package.json`)
```json
{
  "dependencies": {
    "@tanstack/react-query": "^5.0.0",
    "@acta/shared": "file:../../modules/shared"
  }
}
```

### Shared (`modules/shared/package.json`)
```json
{
  "name": "@acta/shared",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}
```

---

## Success Criteria

### Phase 1
- ✅ All endpoints return correct data structures
- ✅ DTOs match frontend expectations
- ✅ Error handling works correctly
- ✅ Health check endpoint responds
- ✅ API can handle concurrent requests

### Phase 2
- ✅ Frontend displays real data (no mocks)
- ✅ Data refreshes on page load/navigation
- ✅ Loading states are smooth
- ✅ Error states are user-friendly
- ✅ TypeScript types are consistent across API and Frontend

---

## Future Enhancements

1. **Real-Time Updates**: SSE or WebSockets for live updates (if needed)
2. **Caching**: Redis for API response caching
3. **Rate Limiting**: Protect API from abuse
4. **Authentication**: Admin endpoints (if needed)
5. **API Versioning**: `/api/v1/...` for future changes
6. **GraphQL**: Alternative to REST (if needed)
7. **CDN**: Serve static verdict data via CDN
8. **Manual Refresh UI**: Add refresh buttons if users want to manually update data

---

## Notes

- **Ideology**: Never exposed in API responses (backend-only)
- **Monthly Verdicts**: API should default to current month, allow historical queries
- **Evidence Bullets**: May be empty initially (future feature)
- **Performance**: Optimize queries with proper indexes, consider pagination for large lists
- **Testing**: Use test database, seed scripts for consistent test data

