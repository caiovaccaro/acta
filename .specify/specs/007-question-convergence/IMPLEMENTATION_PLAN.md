# Question Convergence Feature - Development Plan

## Overview
Implement a manual question convergence feature in the admin panel that allows admins to select multiple semantically similar questions and merge them into a single unified question. This prevents debate fragmentation by consolidating stances, verdicts, and publications into fewer, stronger debates.

## Requirements

### User Story
**As an admin**, I want to merge semantically similar questions so that more publications and stances are concentrated in fewer questions, strengthening each debate.

### Acceptance Criteria
- ✅ Admin can view a list of questions and select two or more to merge into a single final question
- ✅ When merging, all stances, verdicts, publications, and debates are migrated to the final question
- ✅ Old URLs (if any) maintain redirects or aliases to the new unified question
- ✅ No automatic similarity detection required - fully manual, but UI should facilitate the process

## Database Schema Analysis

### Current Question Relationships
Questions have the following relationships that need to be handled during convergence:

1. **ArticleAnalysisAttempt** (one-to-many): `ArticleAnalysisAttempt.questionId` → `Question.id`
   - Unique constraint: `[articleId, questionId, month]` - **Critical for duplicate handling**
   - One analysis attempt per article-question-month triad

2. **ArticleStance** (one-to-many): `ArticleStance.questionId` → `Question.id`
   - Unique constraint: `[articleId, questionId]` - **Critical for duplicate handling**
   - One stance per article-question pair

3. **Verdict** (one-to-many): `Verdict.questionId` → `Question.id`
   - Unique constraint: `[questionId, month]` - **Critical for duplicate handling**
   - One verdict per question per month

4. **TimelineEvent** (one-to-many): `TimelineEvent.questionId` → `Question.id`
   - Optional relationship (can be null)

5. **Topic** (many-to-one): `Question.topicId` → `Topic.id`
   - All questions must belong to the same topic (or handle topic conflicts)

### Constraints
- `ArticleAnalysisAttempt` has unique constraint `[articleId, questionId, month]`
- `ArticleStance` has unique constraint `[articleId, questionId]`
- `Verdict` has unique constraint `[questionId, month]`
- Foreign keys use `onDelete: Cascade` (safe to delete after migration)
- Questions must have same `topicId` (validation required)

### URL Redirect Requirements
- Questions are accessed via `/questions/[id]` routes
- Need to maintain redirects from old question IDs to new unified question ID
- Options:
  1. **Add `redirectsToQuestionId` field to Question model** (simple, but only one redirect level)
  2. **Create separate `QuestionRedirect` table** (more flexible, supports multiple redirects)

**Decision**: Use Option 2 - Create `QuestionRedirect` table for flexibility and audit trail.

## Implementation Plan

### Phase 0: Database Schema Updates

#### 0.1 Create QuestionRedirect Model
**File**: `modules/db/prisma/schema.prisma`

```prisma
model QuestionRedirect {
  id            String   @id @default(uuid())
  oldQuestionId String   @unique  // The question ID that was merged
  newQuestionId String   // The unified question ID
  convergedAt   DateTime @default(now())
  
  // Relations
  oldQuestion   Question @relation("QuestionRedirects", fields: [oldQuestionId], references: [id], onDelete: Cascade)
  newQuestion   Question @relation("QuestionRedirectsTo", fields: [newQuestionId], references: [id], onDelete: Cascade)
  
  @@index([oldQuestionId])
  @@index([newQuestionId])
  @@map("question_redirects")
}

// Add to Question model:
model Question {
  // ... existing fields
  
  // Relations
  redirectsFrom QuestionRedirect[] @relation("QuestionRedirects")
  redirectsTo   QuestionRedirect[] @relation("QuestionRedirectsTo")
}
```

**Migration**: Create migration for new `QuestionRedirect` table.

### Phase 1: Database Layer (Backend)

#### 1.1 Create Question Convergence Repository Function
**File**: `modules/db/src/repositories/questionRepository.ts`

```typescript
interface ConvergeQuestionsInput {
  targetQuestionId: string;  // Question to keep
  sourceQuestionIds: string[];  // Questions to merge into target
  newQuestionText?: string;  // Optional: update question text
  newContextBlurb?: string;  // Optional: update context blurb
}

interface ConvergeQuestionsResult {
  targetQuestion: Question;
  migratedArticleAnalysisAttempts: number;
  migratedArticleStances: number;
  migratedVerdicts: number;
  migratedTimelineEvents: number;
  createdRedirects: number;
  deletedQuestions: number;
}

async function convergeQuestions(input: ConvergeQuestionsInput): Promise<ConvergeQuestionsResult> {
  // Implementation steps:
  // 1. Validate target question exists
  // 2. Validate source questions exist and are different from target
  // 3. Validate all questions belong to same topic
  // 4. Start transaction
  // 5. Migrate ArticleAnalysisAttempts (handle month-based duplicates)
  // 6. Migrate ArticleStances (handle article-question duplicates)
  // 7. Migrate Verdicts (handle month-based duplicates)
  // 8. Migrate TimelineEvents (update questionId)
  // 9. Create QuestionRedirect records for source questions
  // 10. Update target question metadata if provided
  // 11. Delete source questions
  // 12. Commit transaction
  // 13. Return summary
}
```

**Key Implementation Details**:
- Use Prisma transaction to ensure atomicity
- **ArticleAnalysisAttempt duplicates**: If same article-question-month exists, keep the one with highest confidence or most recent `analyzedAt`
- **ArticleStance duplicates**: If same article-question exists, keep the one with most recent `matchedAt`
- **Verdict duplicates**: If same question-month exists, merge verdicts (combine evidence bullets, recalculate confidence) OR keep the one with highest confidence
- Preserve earliest `createdAt` date for TimelineEvents
- Store convergence history in `Question.discoveredFromArticles` JSON field (audit trail)

#### 1.2 Duplicate Handling Strategy

**ArticleAnalysisAttempt** (unique: `[articleId, questionId, month]`):
```typescript
// If source question has analysis attempt for same article+month as target:
// - Keep the one with highest confidence
// - If confidence equal, keep most recent analyzedAt
// - Delete the duplicate
```

**ArticleStance** (unique: `[articleId, questionId]`):
```typescript
// If source question has stance for same article as target:
// - Keep the one with most recent matchedAt
// - Delete the duplicate
```

**Verdict** (unique: `[questionId, month]`):
```typescript
// If source question has verdict for same month as target:
// Option A: Merge verdicts (complex - combine evidence, recalculate)
// Option B: Keep verdict with highest confidence (simpler)
// Decision: Use Option B for MVP, Option A as future enhancement
```

### Phase 2: API Layer

#### 2.1 Create Convergence API Endpoint
**File**: `apps/web/app/admin/api/questions/converge/route.ts`

```typescript
export async function POST(request: Request) {
  const { targetQuestionId, sourceQuestionIds, newQuestionText, newContextBlurb } = await request.json();
  
  // Validation:
  // - At least 2 questions selected (1 target + 1+ source)
  // - Target question exists
  // - Source questions exist
  // - No duplicates in sourceQuestionIds
  // - Target not in sourceQuestionIds
  // - All questions belong to same topic
  
  // Call repository function
  const result = await convergeQuestions({
    targetQuestionId,
    sourceQuestionIds,
    newQuestionText,
    newContextBlurb,
  });
  
  return NextResponse.json(result);
}
```

**Error Handling**:
- 400: Invalid input (missing fields, invalid IDs, different topics)
- 404: Question not found
- 409: Topic mismatch (questions from different topics)
- 500: Database error

### Phase 3: Frontend UI

#### 3.1 Add Convergence Button to Questions Page
**File**: `apps/web/app/admin/questions/page.tsx`

**Changes**:
- Add "Converge Questions" button (enabled when 2+ questions selected)
- Show selected count in button: "Converge 3 Questions"
- Button opens convergence modal

#### 3.2 Create Convergence Modal Component
**File**: `apps/web/app/admin/questions/components/QuestionConvergenceModal.tsx` (NEW)

**Features**:
1. **Question Selection Summary**
   - Display list of selected questions with metadata:
     - Question text (truncated if long)
     - Topic name
     - Article stance count
     - Verdict count
     - Status (isActive, validationStatus)

2. **Target Question Selection**
   - Radio buttons or dropdown to select which question becomes the target
   - Default: First selected question (or question with most stances/verdicts)
   - Visual indicator showing which is the target

3. **Target Question Customization**
   - Textarea to update question text (optional)
   - Textarea to update context blurb (optional)
   - Preview of final question text

4. **Migration Preview**
   - Summary of what will be migrated:
     - Total article analysis attempts to migrate
     - Total article stances to migrate (with duplicate handling note)
     - Total verdicts to migrate (with duplicate handling note)
     - Total timeline events to migrate
   - Warning about source questions being deleted
   - Note about URL redirects being created

5. **Confirmation**
   - "Are you sure?" confirmation step
   - Final summary before execution

6. **Loading State**
   - Show progress during convergence
   - Disable form during processing

7. **Success/Error Handling**
   - Success message with migration summary
   - Error message with details
   - Refresh questions list on success

**UI Flow**:
```
1. User selects 2+ questions → "Converge Questions" button appears
2. Click button → Modal opens
3. Modal shows:
   - Selected questions list
   - Target selection (radio buttons)
   - Optional question text/context blurb fields
   - Preview of migration
4. User confirms → API call
5. Success → Close modal, refresh list, show toast
```

#### 3.3 Update Questions Page State Management
**File**: `apps/web/app/admin/questions/page.tsx`

**Changes**:
- Add state for convergence modal visibility
- Add mutation for convergence API call
- Handle modal open/close
- Refresh questions list after successful convergence

### Phase 4: URL Redirect Handling

#### 4.1 Create Redirect Middleware/Route Handler
**File**: `apps/web/app/questions/[id]/route.ts` (NEW) or middleware

**Option A: Route Handler** (Recommended)
```typescript
// apps/web/app/questions/[id]/route.ts
export async function GET(request: Request, { params }: { params: { id: string } }) {
  // Check if question ID is a redirect
  const redirect = await findQuestionRedirect(params.id);
  
  if (redirect) {
    return NextResponse.redirect(new URL(`/questions/${redirect.newQuestionId}`, request.url), 301);
  }
  
  // Otherwise, proceed with normal question page rendering
  // (This would be handled by the page component)
}
```

**Option B: Middleware** (Alternative)
```typescript
// apps/web/middleware.ts (or next.config.js rewrites)
// Check redirects and rewrite URL before page load
```

**Decision**: Use Option A - Route handler is simpler and more explicit.

#### 4.2 Update Question Lookup Functions
**File**: `apps/web/lib/hooks/useQuestion.ts` and related services

**Changes**:
- Check for redirects before fetching question
- If redirect found, automatically redirect to new question ID

### Phase 5: Business Logic & Edge Cases

#### 5.1 Topic Validation
- All questions must belong to the same topic
- If questions from different topics selected: return error
- Check before transaction starts

#### 5.2 Duplicate ArticleAnalysisAttempt Handling
```typescript
// Pseudo-code
for each sourceQuestion:
  for each analysisAttempt in sourceQuestion:
    // Check if target question has analysis attempt for same article+month
    const existing = await findAnalysisAttempt({
      articleId: analysisAttempt.articleId,
      questionId: targetQuestionId,
      month: analysisAttempt.month,
    });
    
    if (existing) {
      // Keep the one with highest confidence
      if (analysisAttempt.confidence > existing.confidence) {
        update existing with source data
      }
      delete source analysisAttempt
    } else {
      update analysisAttempt.questionId to targetQuestionId
    }
```

#### 5.3 Duplicate ArticleStance Handling
```typescript
// Pseudo-code
for each sourceQuestion:
  for each stance in sourceQuestion:
    // Check if target question has stance for same article
    const existing = await findStance({
      articleId: stance.articleId,
      questionId: targetQuestionId,
    });
    
    if (existing) {
      // Keep the one with most recent matchedAt
      if (stance.matchedAt > existing.matchedAt) {
        update existing with source data
      }
      delete source stance
    } else {
      update stance.questionId to targetQuestionId
    }
```

#### 5.4 Duplicate Verdict Handling
```typescript
// Pseudo-code
for each sourceQuestion:
  for each verdict in sourceQuestion:
    // Check if target question has verdict for same month
    const existing = await findVerdict({
      questionId: targetQuestionId,
      month: verdict.month,
    });
    
    if (existing) {
      // Option B: Keep verdict with highest confidence
      if (verdict.confidence > existing.confidence) {
        // Migrate evidence bullets from source to target
        await migrateEvidenceBullets(verdict.id, existing.id);
        // Update existing verdict with source data
        update existing with source verdict data
      } else {
        // Migrate evidence bullets from source to target (keep both sets)
        await migrateEvidenceBullets(verdict.id, existing.id);
      }
      delete source verdict
    } else {
      update verdict.questionId to targetQuestionId
    }
```

#### 5.5 Evidence Bullet Migration
When merging verdicts, evidence bullets from source verdict should be migrated to target verdict:
```typescript
// Migrate evidence bullets, avoiding duplicates
for each evidenceBullet in sourceVerdict:
  // Check for duplicate text in target verdict
  const duplicate = await findDuplicateEvidenceBullet({
    verdictId: targetVerdictId,
    text: evidenceBullet.text,
  });
  
  if (!duplicate) {
    create new evidenceBullet with targetVerdictId
  }
  delete source evidenceBullet
```

#### 5.6 Metadata Merging Strategy
- **questionText**: Use provided `newQuestionText` or keep target question text
- **contextBlurb**: Use provided `newContextBlurb` or merge context blurbs (concatenate with separator)
- **originalQuestionText**: Keep target's originalQuestionText (or merge if needed)
- **confidence**: Use highest confidence from all questions
- **sourceArticlesCount**: Sum all sourceArticlesCount values
- **validationStatus**: Use target question's status (or most permissive: validated > pending > rejected > needs_reformulation)
- **isActive**: Use `true` if any question has it set to `true`
- **discoveredFromArticles**: Merge JSON arrays if both have data

#### 5.7 Audit Trail
Store convergence history in target question:
```json
{
  "convergedAt": "2025-01-15T10:30:00Z",
  "sourceQuestions": [
    { "id": "uuid1", "questionText": "Will AI dominate..." },
    { "id": "uuid2", "questionText": "Can AI take over..." }
  ],
  "performedBy": "admin-user-id" // If auth is added
}
```

### Phase 6: Testing

This phase implements comprehensive testing across multiple layers to ensure reliability, correctness, and maintainability of the question convergence feature.

#### 6.1 Unit Tests

##### 6.1.1 Repository Layer Tests
**File**: `modules/db/src/repositories/__tests__/questionRepository.test.ts` (NEW)

**Framework**: Jest + Prisma Mock Client

**Test Cases**:
- ✅ Converge 2 questions successfully
  - Verify all ArticleAnalysisAttempts migrated
  - Verify all ArticleStances migrated
  - Verify all Verdicts migrated
  - Verify all EvidenceBullets migrated
  - Verify all TimelineEvents migrated
  - Verify source questions deleted
  - Verify target question updated
  - Verify QuestionRedirects created
- ✅ Converge 3+ questions
  - Test with 3, 4, 5 questions
  - Verify all relationships migrated correctly
- ✅ Handle duplicate ArticleAnalysisAttempts
  - Same article+question+month exists in target
  - Keep the one with highest confidence
  - If confidence equal, keep most recent `analyzedAt`
  - Delete duplicate records
- ✅ Handle duplicate ArticleStances
  - Same article+question exists in target
  - Keep the one with most recent `matchedAt`
  - Delete duplicate records
- ✅ Handle duplicate Verdicts
  - Same question+month exists in target
  - Keep verdict with highest confidence
  - Migrate evidence bullets from source to target
  - Delete duplicate verdict
- ✅ Evidence bullet migration
  - Migrate evidence bullets from source verdict to target
  - Avoid duplicate evidence bullets (same text)
  - Preserve evidence bullet types
- ✅ Handle topic mismatch
  - Questions from different topics → error
  - Validation before transaction starts
- ✅ Handle missing questions
  - Target question doesn't exist → error
  - Source question doesn't exist → error
  - Invalid UUIDs → error
- ✅ Transaction rollback on error
  - Simulate error during migration
  - Verify no partial updates
  - Verify database state unchanged
- ✅ Metadata merging logic
  - `questionText`: use provided or keep target
  - `contextBlurb`: merge or use provided
  - `confidence`: use highest from all questions
  - `sourceArticlesCount`: sum all values
  - `validationStatus`: use target's status
  - `isActive`: true if any question has it
  - `discoveredFromArticles`: merge JSON arrays
- ✅ QuestionRedirect creation
  - Verify redirect created for each source question
  - Verify redirect points to target question
  - Verify `convergedAt` timestamp set
- ✅ URL redirect lookup
  - Find redirect by old question ID
  - Return new question ID
  - Handle non-existent redirects

**Test Structure**:
```typescript
describe('convergeQuestions', () => {
  beforeEach(() => {
    // Setup test database
    // Create test questions with relationships
  });

  afterEach(() => {
    // Cleanup test data
  });

  describe('successful convergence', () => {
    it('should converge 2 questions', async () => { /* ... */ });
    it('should converge 3+ questions', async () => { /* ... */ });
  });

  describe('duplicate handling', () => {
    it('should handle duplicate ArticleAnalysisAttempts', async () => { /* ... */ });
    it('should keep highest confidence analysis attempt', async () => { /* ... */ });
    it('should handle duplicate ArticleStances', async () => { /* ... */ });
    it('should keep most recent stance', async () => { /* ... */ });
    it('should handle duplicate Verdicts', async () => { /* ... */ });
    it('should keep highest confidence verdict', async () => { /* ... */ });
    it('should migrate evidence bullets correctly', async () => { /* ... */ });
  });

  describe('error handling', () => {
    it('should reject invalid target question ID', async () => { /* ... */ });
    it('should reject topic mismatch', async () => { /* ... */ });
    it('should rollback on transaction error', async () => { /* ... */ });
  });

  describe('metadata merging', () => {
    it('should merge questionText correctly', async () => { /* ... */ });
    it('should merge contextBlurb correctly', async () => { /* ... */ });
    it('should use highest confidence', async () => { /* ... */ });
    it('should sum sourceArticlesCount', async () => { /* ... */ });
  });

  describe('redirects', () => {
    it('should create QuestionRedirects for source questions', async () => { /* ... */ });
    it('should find redirect by old question ID', async () => { /* ... */ });
  });
});
```

##### 6.1.2 Service Layer Tests
**File**: `apps/api/src/services/__tests__/questionsService.test.ts` (UPDATE)

**Framework**: Jest + Mock Repository

**Test Cases**:
- ✅ Call repository function with correct parameters
- ✅ Transform repository response to DTO format
- ✅ Handle repository errors
- ✅ Validate input parameters

##### 6.1.3 Component Tests
**File**: `apps/web/app/admin/questions/__tests__/QuestionConvergenceModal.test.tsx` (NEW)

**Framework**: Jest + React Testing Library + @testing-library/user-event

**Test Cases**:
- ✅ Renders modal when opened
- ✅ Displays selected questions list
- ✅ Shows question text (truncated if long)
- ✅ Shows topic name for each question
- ✅ Shows article stance count
- ✅ Shows verdict count
- ✅ Shows question status (isActive, validationStatus)
- ✅ Allows target question selection (radio buttons)
- ✅ Default target selection (first or most stances)
- ✅ Visual indicator for target question
- ✅ Allows optional question text update (textarea)
- ✅ Allows optional context blurb update (textarea)
- ✅ Shows migration preview with counts
- ✅ Shows warning about source questions being deleted
- ✅ Shows note about URL redirects
- ✅ Handles form submission
- ✅ Displays loading state during API call
- ✅ Displays success message with migration summary
- ✅ Displays error message with details
- ✅ Closes modal on success
- ✅ Closes modal on cancel
- ✅ Validates minimum 2 questions selected
- ✅ Prevents submission without target selection

**Test Structure**:
```typescript
describe('QuestionConvergenceModal', () => {
  const mockQuestions = [
    { 
      id: '1', 
      questionText: 'Will AI dominate the world?', 
      topic: { name: 'AI' },
      _count: { articleStances: 10, verdicts: 3 },
      isActive: true,
      validationStatus: 'validated',
    },
    { 
      id: '2', 
      questionText: 'Can AI take over humanity?', 
      topic: { name: 'AI' },
      _count: { articleStances: 7, verdicts: 2 },
      isActive: true,
      validationStatus: 'validated',
    },
  ];

  it('should render selected questions', () => {
    render(<QuestionConvergenceModal questions={mockQuestions} onClose={jest.fn()} />);
    expect(screen.getByText(/Will AI dominate/i)).toBeInTheDocument();
    expect(screen.getByText(/Can AI take over/i)).toBeInTheDocument();
  });

  it('should allow target selection', async () => {
    const user = userEvent.setup();
    render(<QuestionConvergenceModal questions={mockQuestions} onClose={jest.fn()} />);
    
    const radio = screen.getByLabelText(/Will AI dominate/i);
    await user.click(radio);
    expect(radio).toBeChecked();
  });

  it('should submit convergence request', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    
    render(<QuestionConvergenceModal questions={mockQuestions} onSuccess={mockOnSuccess} />);
    
    // Select target, fill form, submit
    await user.click(screen.getByLabelText(/Will AI dominate/i));
    await user.click(screen.getByRole('button', { name: /converge/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

##### 6.1.4 Hook Tests
**File**: `apps/web/app/admin/questions/__tests__/useQuestionConvergence.test.ts` (NEW)

**Framework**: Jest + React Testing Library + @tanstack/react-query

**Test Cases**:
- ✅ Calls API endpoint with correct payload
- ✅ Handles loading state
- ✅ Handles success state
- ✅ Handles error state
- ✅ Invalidates questions query on success
- ✅ Resets form state on success

#### 6.2 Integration Tests

##### 6.2.1 API Endpoint Tests
**File**: `apps/web/app/admin/api/__tests__/questions/converge.test.ts` (NEW)

**Framework**: Jest + Supertest (or Next.js test utilities)

**Test Cases**:
- ✅ POST `/admin/api/questions/converge` with valid data
  - Returns 200 with convergence summary
  - Verifies database changes
  - Verifies QuestionRedirects created
- ✅ Validation errors
  - Missing `targetQuestionId` → 400
  - Missing `sourceQuestionIds` → 400
  - Empty `sourceQuestionIds` → 400
  - Invalid UUIDs → 400
  - Target in sourceQuestionIds → 400
- ✅ Business logic errors
  - Target question not found → 404
  - Source question not found → 404
  - Topic mismatch → 409
- ✅ Database transaction integrity
  - Verify atomicity (all or nothing)
  - Verify no orphaned records
  - Verify foreign key constraints maintained
  - Verify unique constraints maintained

**Test Structure**:
```typescript
describe('POST /admin/api/questions/converge', () => {
  let testTargetQuestion: Question;
  let testSourceQuestions: Question[];
  let testTopic: Topic;

  beforeEach(async () => {
    // Create test topic
    testTopic = await createTestTopic('AI');
    
    // Create test questions with relationships
    testTargetQuestion = await createTestQuestion('Target Question', testTopic.id);
    testSourceQuestions = await Promise.all([
      createTestQuestion('Source 1', testTopic.id),
      createTestQuestion('Source 2', testTopic.id),
    ]);
  });

  it('should converge questions successfully', async () => {
    const response = await request(app)
      .post('/admin/api/questions/converge')
      .send({
        targetQuestionId: testTargetQuestion.id,
        sourceQuestionIds: testSourceQuestions.map(q => q.id),
      })
      .expect(200);

    expect(response.body.migratedArticleStances).toBeGreaterThan(0);
    expect(response.body.deletedQuestions).toBe(2);
    expect(response.body.createdRedirects).toBe(2);

    // Verify database state
    const targetQuestion = await findQuestionById(testTargetQuestion.id);
    expect(targetQuestion).toBeDefined();
    
    const sourceQuestions = await findQuestionsByIds(testSourceQuestions.map(q => q.id));
    expect(sourceQuestions).toHaveLength(0);

    // Verify redirects
    const redirects = await findQuestionRedirectsByOldId(testSourceQuestions[0].id);
    expect(redirects).toBeDefined();
    expect(redirects.newQuestionId).toBe(testTargetQuestion.id);
  });

  it('should return 409 for topic mismatch', async () => {
    const otherTopic = await createTestTopic('Other Topic');
    const otherQuestion = await createTestQuestion('Other Question', otherTopic.id);

    await request(app)
      .post('/admin/api/questions/converge')
      .send({
        targetQuestionId: testTargetQuestion.id,
        sourceQuestionIds: [otherQuestion.id],
      })
      .expect(409);
  });
});
```

##### 6.2.2 Database Transaction Tests
**File**: `modules/db/src/repositories/__tests__/questionRepository.integration.test.ts` (NEW)

**Framework**: Jest + Real Prisma Client + Test Database

**Test Cases**:
- ✅ Full transaction flow with real database
- ✅ Verify data consistency after convergence
- ✅ Verify foreign key constraints
- ✅ Verify unique constraints (ArticleAnalysisAttempt, ArticleStance, Verdict)
- ✅ Performance test with large datasets
  - Questions with 100+ article stances
  - Questions with 50+ verdicts
  - Questions with 1000+ evidence bullets
- ✅ Concurrent convergence attempts (should be prevented or handled)
- ✅ Duplicate resolution correctness
  - ArticleAnalysisAttempt: highest confidence wins
  - ArticleStance: most recent wins
  - Verdict: highest confidence wins

**Prerequisites**:
- Test database must be running
- Database cleanup between tests
- Use transactions that rollback after each test

##### 6.2.3 URL Redirect Integration Tests
**File**: `apps/web/app/questions/__tests__/[id]/redirect.integration.test.ts` (NEW)

**Framework**: Jest + Next.js test utilities

**Test Cases**:
- ✅ Redirect route handler returns 301
- ✅ Redirect URL is correct
- ✅ Non-existent question ID returns 404
- ✅ Question without redirect loads normally
- ✅ Redirect chain resolution (A → B → C)
- ✅ Redirect preserves query parameters

**Test Structure**:
```typescript
describe('Question Redirect Route', () => {
  let targetQuestion: Question;
  let sourceQuestion: Question;

  beforeEach(async () => {
    const topic = await createTestTopic('Test Topic');
    targetQuestion = await createTestQuestion('Target', topic.id);
    sourceQuestion = await createTestQuestion('Source', topic.id);
    
    // Create redirect
    await createQuestionRedirect(sourceQuestion.id, targetQuestion.id);
  });

  it('should redirect old question ID to new question ID', async () => {
    const response = await fetch(`/questions/${sourceQuestion.id}`);
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`/questions/${targetQuestion.id}`);
  });

  it('should return 404 for non-existent question', async () => {
    const response = await fetch('/questions/non-existent-id');
    expect(response.status).toBe(404);
  });
});
```

#### 6.3 Component Integration Tests

##### 6.3.1 Questions Page Integration
**File**: `apps/web/app/admin/questions/__tests__/page.integration.test.tsx` (NEW)

**Framework**: Jest + React Testing Library + MSW (Mock Service Worker)

**Test Cases**:
- ✅ Questions page renders with convergence button
- ✅ Button enabled when 2+ questions selected
- ✅ Button disabled when < 2 questions selected
- ✅ Modal opens on button click
- ✅ Modal closes after successful convergence
- ✅ Questions list refreshes after convergence
- ✅ Selected questions cleared after convergence
- ✅ Error toast displayed on failure
- ✅ Topic filter works with convergence

**Test Structure**:
```typescript
describe('Questions Page Integration', () => {
  const server = setupServer(
    rest.get('/admin/api/questions', (req, res, ctx) => {
      return res(ctx.json(mockQuestions));
    }),
    rest.post('/admin/api/questions/converge', (req, res, ctx) => {
      return res(ctx.json({ success: true }));
    }),
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should open convergence modal and submit', async () => {
    const user = userEvent.setup();
    render(<AdminQuestions />);

    // Select questions
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    // Click converge button
    await user.click(screen.getByRole('button', { name: /converge/i }));

    // Verify modal opens
    expect(screen.getByText(/converge questions/i)).toBeInTheDocument();

    // Complete convergence flow
    // ...
  });
});
```

#### 6.4 End-to-End (E2E) Tests

##### 6.4.1 User Flow Tests
**File**: `apps/web/__tests__/e2e/question-convergence.spec.ts` (NEW)

**Framework**: Playwright (or Cypress)

**Test Cases**:
- ✅ Complete convergence flow
  1. Navigate to admin questions page
  2. Select 2 questions
  3. Click "Converge Questions"
  4. Select target question in modal
  5. Optionally update question text/context blurb
  6. Review migration preview
  7. Confirm convergence
  8. Verify success message
  9. Verify questions list updated
  10. Verify source questions removed
- ✅ URL redirect flow
  1. Converge questions
  2. Navigate to old question URL
  3. Verify redirect to new question URL
  4. Verify new question page loads correctly
- ✅ Error handling flow
  - Invalid question selection
  - Topic mismatch error
  - Network error handling
- ✅ UI interactions
  - Modal open/close animations
  - Loading states
  - Form validation
  - Keyboard navigation

**Test Structure**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Question Convergence E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/questions');
  });

  test('should complete full convergence flow', async ({ page }) => {
    // Select questions
    await page.check('input[type="checkbox"][value="question-1"]');
    await page.check('input[type="checkbox"][value="question-2"]');

    // Click converge button
    await page.click('button:has-text("Converge Questions")');

    // Verify modal opens
    await expect(page.locator('text=Converge Questions')).toBeVisible();

    // Select target question
    await page.check('input[type="radio"][value="question-1"]');

    // Confirm convergence
    await page.click('button:has-text("Confirm Convergence")');

    // Verify success
    await expect(page.locator('text=Questions converged successfully')).toBeVisible();

    // Verify questions list updated
    await expect(page.locator('text=question-2')).not.toBeVisible();
  });

  test('should redirect old question URL to new question URL', async ({ page }) => {
    // After convergence, navigate to old question URL
    await page.goto('/questions/old-question-id');
    
    // Verify redirect to new question URL
    await expect(page).toHaveURL(/\/questions\/new-question-id/);
  });
});
```

#### 6.5 Contract Tests

##### 6.5.1 API Contract Tests
**File**: `apps/web/app/admin/api/__tests__/questions/converge.contract.test.ts` (NEW)

**Framework**: Jest + JSON Schema validation

**Test Cases**:
- ✅ Request payload schema validation
- ✅ Response payload schema validation
- ✅ Error response schema validation
- ✅ Type safety (TypeScript)

**Schema Example**:
```typescript
const convergeRequestSchema = {
  type: 'object',
  required: ['targetQuestionId', 'sourceQuestionIds'],
  properties: {
    targetQuestionId: { type: 'string', format: 'uuid' },
    sourceQuestionIds: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
      minItems: 1,
    },
    newQuestionText: { type: 'string', minLength: 1 },
    newContextBlurb: { type: 'string' },
  },
};
```

#### 6.6 Performance Tests

##### 6.6.1 Database Performance Tests
**File**: `modules/db/src/repositories/__tests__/questionRepository.performance.test.ts` (NEW)

**Test Cases**:
- ✅ Convergence with 100+ article stances
- ✅ Convergence with 50+ verdicts
- ✅ Convergence with 1000+ evidence bullets
- ✅ Convergence with 100+ article analysis attempts
- ✅ Transaction duration < 10 seconds for typical case
- ✅ Memory usage during large convergence
- ✅ Database query count optimization
- ✅ Duplicate resolution performance

**Metrics to Track**:
- Execution time
- Database query count
- Memory usage
- Transaction duration
- Duplicate resolution time

#### 6.7 Manual Testing Checklist

**Pre-Release Manual Testing**:
- [ ] **Basic Flow**
  - [ ] Select 2 questions and converge
  - [ ] Select 3+ questions and converge
  - [ ] Verify all article analysis attempts migrated correctly
  - [ ] Verify all article stances migrated (check for duplicates)
  - [ ] Verify all verdicts migrated (check for duplicates)
  - [ ] Verify evidence bullets migrated correctly
  - [ ] Verify timeline events migrated
  - [ ] Verify source questions deleted
  - [ ] Verify redirects created
  - [ ] Verify audit trail stored in target question

- [ ] **Duplicate Handling**
  - [ ] ArticleAnalysisAttempt: same article+month → highest confidence kept
  - [ ] ArticleStance: same article → most recent kept
  - [ ] Verdict: same month → highest confidence kept, evidence bullets merged
  - [ ] Evidence bullets: duplicate text not created

- [ ] **URL Redirects**
  - [ ] Old question URL redirects to new question URL
  - [ ] Redirect is permanent (301)
  - [ ] Redirect preserves query parameters
  - [ ] Old question page loads new question content
  - [ ] Non-existent question ID returns 404
  - [ ] Question without redirect loads normally

- [ ] **Customization**
  - [ ] Update question text during convergence
  - [ ] Update context blurb during convergence
  - [ ] Keep default question text and context blurb

- [ ] **Edge Cases**
  - [ ] Questions with no stances/verdicts
  - [ ] Questions with duplicate stances (same article)
  - [ ] Questions with duplicate verdicts (same month)
  - [ ] Questions with many evidence bullets (100+)
  - [ ] Questions with many article stances (100+)
  - [ ] Questions with many verdicts (50+)

- [ ] **Error Cases**
  - [ ] Invalid question IDs → error message
  - [ ] Questions from different topics → error message (409)
  - [ ] Network error → error message
  - [ ] Database error → error message
  - [ ] Empty sourceQuestionIds → validation error

- [ ] **UI/UX**
  - [ ] Modal opens/closes smoothly
  - [ ] Loading states display correctly
  - [ ] Success/error messages clear
  - [ ] Questions list refreshes after convergence
  - [ ] Selected questions cleared after convergence
  - [ ] Keyboard navigation works
  - [ ] Mobile responsive (if applicable)

- [ ] **Data Integrity**
  - [ ] No orphaned records after convergence
  - [ ] Foreign key constraints maintained
  - [ ] Unique constraints maintained (ArticleAnalysisAttempt, ArticleStance, Verdict)
  - [ ] Audit trail accurate and complete
  - [ ] Redirects point to correct question IDs

#### 6.8 Test Coverage Goals

**Target Coverage**:
- Repository layer: **90%+**
- Service layer: **85%+**
- API endpoints: **90%+**
- React components: **80%+**
- Hooks: **85%+**
- URL redirect handler: **95%+**
- Integration tests: **All critical paths**
- E2E tests: **Main user flows**

**Coverage Tools**:
- Jest coverage reports (`--coverage`)
- Codecov or similar for CI/CD integration

#### 6.9 Test Execution Strategy

**Local Development**:
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:db          # Repository tests
npm run test:api         # API tests
npm run test:web         # Component tests
npm run test:e2e         # E2E tests

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**CI/CD Pipeline**:
1. **Unit tests** (fast, run on every commit)
2. **Integration tests** (medium speed, run on PR)
3. **E2E tests** (slower, run on merge to main)
4. **Performance tests** (periodic, nightly)

**Test Data Management**:
- Use test database for integration tests
- Use factories/fixtures for consistent test data
- Clean up test data after each test
- Use database transactions that rollback
- Create test questions with realistic relationships (stances, verdicts, evidence bullets)

### Phase 7: Documentation

#### 7.1 User Documentation
- How to use the convergence feature
- When to use it (semantically similar questions)
- What happens to the data
- URL redirect behavior
- Best practices

#### 7.2 Technical Documentation
- API endpoint documentation
- Database migration details
- URL redirect mechanism
- Edge cases and handling

## Implementation Order

1. **Phase 0**: Database schema updates (QuestionRedirect model)
2. **Phase 1**: Database repository function (core logic)
3. **Phase 2**: API endpoint (backend interface)
4. **Phase 3**: Frontend UI (user interface)
5. **Phase 4**: URL redirect handling
6. **Phase 5**: Edge cases and refinements
7. **Phase 6**: Testing
8. **Phase 7**: Documentation

## Estimated Complexity

- **Database Schema**: Low (add QuestionRedirect table)
- **Database Layer**: High (complex duplicate handling for 3 relationship types)
- **API Layer**: Medium (validation + call repository)
- **Frontend UI**: Medium (modal, state management, UX)
- **URL Redirects**: Medium (route handler + middleware integration)
- **Testing**: High (various edge cases, duplicate scenarios)
- **Total**: ~4-5 days of development

## Future Enhancements

1. **Automatic Similarity Detection**: Suggest questions that might need convergence using LLM or text similarity
2. **Verdict Merging**: Implement Option A for verdict merging (combine evidence, recalculate confidence)
3. **Undo Functionality**: Store enough data to reverse convergence
4. **Bulk Convergence**: Converge multiple groups at once
5. **Preview Mode**: Show what would happen without executing
6. **Convergence History**: View past convergences in admin
7. **Redirect Chain Resolution**: Handle multiple levels of redirects (A → B → C)

## Security Considerations

- Ensure only authenticated admin users can access
- Validate all inputs server-side
- Use transactions to prevent partial updates
- Log convergence actions for audit
- Validate topic ownership before convergence

