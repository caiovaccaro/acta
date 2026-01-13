# Topic Convergence Feature - Development Plan

## Overview
Implement a manual topic convergence feature in the admin panel that allows admins to select multiple topics and merge them into a single unified topic.

## Database Schema Analysis

### Current Topic Relationships
Topics have the following relationships that need to be handled during convergence:

1. **Questions** (one-to-many): `Question.topicId` → `Topic.id`
2. **TopicArticle** (many-to-many): `TopicArticle.topicId` → `Topic.id`
3. **TimelineEvent** (one-to-many): `TimelineEvent.topicId` → `Topic.id`

### Constraints
- `Topic.name` is unique (must handle name conflicts)
- Foreign keys use `onDelete: Cascade` (safe to delete after migration)

## Implementation Plan

### Phase 1: Database Layer (Backend)

#### 1.1 Create Topic Convergence Repository Function
**File**: `modules/db/src/repositories/topicRepository.ts`

```typescript
interface ConvergeTopicsInput {
  targetTopicId: string;  // Topic to keep
  sourceTopicIds: string[];  // Topics to merge into target
  newName?: string;  // Optional: rename target topic
  newDescription?: string;  // Optional: update description
}

async function convergeTopics(input: ConvergeTopicsInput): Promise<{
  targetTopic: Topic;
  migratedQuestions: number;
  migratedTopicArticles: number;
  migratedTimelineEvents: number;
  deletedTopics: number;
}> {
  // Implementation steps:
  // 1. Validate target topic exists
  // 2. Validate source topics exist and are different from target
  // 3. Check for name conflicts if renaming
  // 4. Start transaction
  // 5. Migrate Questions (update topicId)
  // 6. Migrate TopicArticles (update topicId, handle duplicates)
  // 7. Migrate TimelineEvents (update topicId)
  // 8. Update target topic metadata if provided
  // 9. Delete source topics
  // 10. Commit transaction
  // 11. Return summary
}
```

**Key Implementation Details**:
- Use Prisma transaction to ensure atomicity
- Handle `TopicArticle` duplicates: if article already linked to target topic, delete duplicate
- Preserve earliest `assignedAt` date for `TopicArticle` records
- Preserve earliest `createdAt` date for `TimelineEvent` records
- Store convergence history in `Topic.discoveredFromArticles` JSON field (audit trail)

#### 1.2 Add Audit Trail Field (Optional Enhancement)
**File**: `modules/db/prisma/schema.prisma`

```prisma
model Topic {
  // ... existing fields
  convergenceHistory Json?  // Store history of converged topics
  // Format: { convergedAt: DateTime, sourceTopicIds: string[], sourceTopicNames: string[] }
}
```

### Phase 2: API Layer

#### 2.1 Create Convergence API Endpoint
**File**: `apps/web/app/admin/api/topics/converge/route.ts`

```typescript
export async function POST(request: Request) {
  const { targetTopicId, sourceTopicIds, newName, newDescription } = await request.json();
  
  // Validation:
  // - At least 2 topics selected (1 target + 1+ source)
  // - Target topic exists
  // - Source topics exist
  // - No duplicates in sourceTopicIds
  // - Target not in sourceTopicIds
  
  // Call repository function
  const result = await convergeTopics({
    targetTopicId,
    sourceTopicIds,
    newName,
    newDescription,
  });
  
  return NextResponse.json(result);
}
```

**Error Handling**:
- 400: Invalid input (missing fields, invalid IDs)
- 404: Topic not found
- 409: Name conflict if renaming
- 500: Database error

### Phase 3: Frontend UI

#### 3.1 Add Convergence Button to Topics Page
**File**: `apps/web/app/admin/topics/page.tsx`

**Changes**:
- Add "Converge Topics" button (enabled when 2+ topics selected)
- Show selected count in button: "Converge 3 Topics"
- Button opens convergence modal

#### 3.2 Create Convergence Modal Component
**File**: `apps/web/app/admin/topics/components/TopicConvergenceModal.tsx` (NEW)

**Features**:
1. **Topic Selection Summary**
   - Display list of selected topics with metadata:
     - Name
     - Question count
     - Article count
     - Status

2. **Target Topic Selection**
   - Radio buttons or dropdown to select which topic becomes the target
   - Default: First selected topic (or topic with most questions)
   - Visual indicator showing which is the target

3. **Target Topic Customization**
   - Input field to rename target topic (optional)
   - Textarea to update description (optional)
   - Preview of final topic name

4. **Migration Preview**
   - Summary of what will be migrated:
     - Total questions to migrate
     - Total articles to migrate (with duplicate handling note)
     - Total timeline events to migrate
   - Warning about source topics being deleted

5. **Confirmation**
   - "Are you sure?" confirmation step
   - Final summary before execution

6. **Loading State**
   - Show progress during convergence
   - Disable form during processing

7. **Success/Error Handling**
   - Success message with migration summary
   - Error message with details
   - Refresh topics list on success

**UI Flow**:
```
1. User selects 2+ topics → "Converge Topics" button appears
2. Click button → Modal opens
3. Modal shows:
   - Selected topics list
   - Target selection (radio buttons)
   - Optional rename/description fields
   - Preview of migration
4. User confirms → API call
5. Success → Close modal, refresh list, show toast
```

#### 3.3 Update Topics Page State Management
**File**: `apps/web/app/admin/topics/page.tsx`

**Changes**:
- Add state for convergence modal visibility
- Add mutation for convergence API call
- Handle modal open/close
- Refresh topics list after successful convergence

### Phase 4: Business Logic & Edge Cases

#### 4.1 Name Conflict Handling
- If renaming target topic to a name that exists: return error
- Check before transaction starts

#### 4.2 Duplicate TopicArticle Handling
```typescript
// Pseudo-code
for each sourceTopic:
  for each topicArticle in sourceTopic:
    if article already linked to targetTopic:
      // Keep the one with earliest assignedAt
      if sourceTopicArticle.assignedAt < existingTopicArticle.assignedAt:
        update existingTopicArticle.assignedAt
      delete sourceTopicArticle
    else:
      update topicArticle.topicId to targetTopicId
```

#### 4.3 Metadata Merging Strategy
- **Name**: Use provided `newName` or keep target topic name
- **Description**: Use provided `newDescription` or merge descriptions (concatenate with separator)
- **safetyNoteRequired**: Use `true` if any topic has it set to `true`
- **moderationStatus**: Use target topic's status (or most permissive: approved > pending > rejected)
- **source**: Keep target topic's source
- **discoveredFromArticles**: Merge JSON arrays if both have data

#### 4.4 Audit Trail
Store convergence history in target topic:
```json
{
  "convergedAt": "2025-01-15T10:30:00Z",
  "sourceTopics": [
    { "id": "uuid1", "name": "Climate Change" },
    { "id": "uuid2", "name": "Global Warming" }
  ],
  "performedBy": "admin-user-id" // If auth is added
}
```

### Phase 5: Testing

This phase implements comprehensive testing across multiple layers to ensure reliability, correctness, and maintainability of the topic convergence feature.

#### 5.1 Unit Tests

##### 5.1.1 Repository Layer Tests
**File**: `modules/db/src/repositories/__tests__/topicRepository.test.ts` (NEW)

**Framework**: Jest + Prisma Mock Client

**Test Cases**:
- ✅ Converge 2 topics successfully
  - Verify all questions migrated
  - Verify all TopicArticles migrated
  - Verify all TimelineEvents migrated
  - Verify source topics deleted
  - Verify target topic updated
- ✅ Converge 3+ topics
  - Test with 3, 4, 5 topics
  - Verify all relationships migrated correctly
- ✅ Handle duplicate TopicArticles
  - Article already linked to target topic
  - Preserve earliest `assignedAt` date
  - Delete duplicate records
- ✅ Handle name conflicts
  - Rename to existing topic name → error
  - Rename to non-existent name → success
- ✅ Handle missing topics
  - Target topic doesn't exist → error
  - Source topic doesn't exist → error
  - Invalid UUIDs → error
- ✅ Transaction rollback on error
  - Simulate error during migration
  - Verify no partial updates
  - Verify database state unchanged
- ✅ Metadata merging logic
  - `safetyNoteRequired`: true if any topic has it
  - `moderationStatus`: use target's status
  - `description`: merge or use provided
  - `discoveredFromArticles`: merge JSON arrays
- ✅ Audit trail storage
  - Verify convergence history stored
  - Verify correct format and data
- ✅ Edge cases
  - Topics with no questions/articles/events
  - Empty sourceTopicIds array
  - Target topic in sourceTopicIds array
  - Duplicate IDs in sourceTopicIds

**Test Structure**:
```typescript
describe('convergeTopics', () => {
  beforeEach(() => {
    // Setup test database
    // Create test topics with relationships
  });

  afterEach(() => {
    // Cleanup test data
  });

  describe('successful convergence', () => {
    it('should converge 2 topics', async () => { /* ... */ });
    it('should converge 3+ topics', async () => { /* ... */ });
  });

  describe('duplicate handling', () => {
    it('should handle duplicate TopicArticles', async () => { /* ... */ });
    it('should preserve earliest assignedAt date', async () => { /* ... */ });
  });

  describe('error handling', () => {
    it('should reject invalid target topic ID', async () => { /* ... */ });
    it('should reject name conflicts', async () => { /* ... */ });
    it('should rollback on transaction error', async () => { /* ... */ });
  });

  describe('metadata merging', () => {
    it('should merge safetyNoteRequired correctly', async () => { /* ... */ });
    it('should merge descriptions', async () => { /* ... */ });
  });
});
```

##### 5.1.2 Service Layer Tests
**File**: `apps/api/src/services/__tests__/topicsService.test.ts` (UPDATE)

**Framework**: Jest + Mock Repository

**Test Cases**:
- ✅ Call repository function with correct parameters
- ✅ Transform repository response to DTO format
- ✅ Handle repository errors
- ✅ Validate input parameters

##### 5.1.3 Component Tests
**File**: `apps/web/app/admin/topics/__tests__/TopicConvergenceModal.test.tsx` (NEW)

**Framework**: Jest + React Testing Library + @testing-library/user-event

**Test Cases**:
- ✅ Renders modal when opened
- ✅ Displays selected topics list
- ✅ Allows target topic selection (radio buttons)
- ✅ Shows topic metadata (name, counts, status)
- ✅ Allows optional rename input
- ✅ Allows optional description update
- ✅ Shows migration preview
- ✅ Shows confirmation step
- ✅ Handles form submission
- ✅ Displays loading state during API call
- ✅ Displays success message
- ✅ Displays error message
- ✅ Closes modal on success
- ✅ Closes modal on cancel
- ✅ Validates minimum 2 topics selected
- ✅ Prevents submission without target selection

**Test Structure**:
```typescript
describe('TopicConvergenceModal', () => {
  const mockTopics = [
    { id: '1', name: 'Topic 1', questionCount: 5, articleCount: 10 },
    { id: '2', name: 'Topic 2', questionCount: 3, articleCount: 7 },
  ];

  it('should render selected topics', () => {
    render(<TopicConvergenceModal topics={mockTopics} onClose={jest.fn()} />);
    expect(screen.getByText('Topic 1')).toBeInTheDocument();
    expect(screen.getByText('Topic 2')).toBeInTheDocument();
  });

  it('should allow target selection', async () => {
    const user = userEvent.setup();
    render(<TopicConvergenceModal topics={mockTopics} onClose={jest.fn()} />);
    
    const radio = screen.getByLabelText('Topic 1');
    await user.click(radio);
    expect(radio).toBeChecked();
  });

  it('should submit convergence request', async () => {
    const mockOnSuccess = jest.fn();
    const user = userEvent.setup();
    
    render(<TopicConvergenceModal topics={mockTopics} onSuccess={mockOnSuccess} />);
    
    // Select target, fill form, submit
    await user.click(screen.getByLabelText('Topic 1'));
    await user.click(screen.getByRole('button', { name: /converge/i }));
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });
});
```

##### 5.1.4 Hook Tests
**File**: `apps/web/app/admin/topics/__tests__/useTopicConvergence.test.ts` (NEW)

**Framework**: Jest + React Testing Library + @tanstack/react-query

**Test Cases**:
- ✅ Calls API endpoint with correct payload
- ✅ Handles loading state
- ✅ Handles success state
- ✅ Handles error state
- ✅ Invalidates topics query on success
- ✅ Resets form state on success

#### 5.2 Integration Tests

##### 5.2.1 API Endpoint Tests
**File**: `apps/web/app/admin/api/__tests__/topics/converge.test.ts` (NEW)

**Framework**: Jest + Supertest (or Next.js test utilities)

**Test Cases**:
- ✅ POST `/admin/api/topics/converge` with valid data
  - Returns 200 with convergence summary
  - Verifies database changes
- ✅ Validation errors
  - Missing `targetTopicId` → 400
  - Missing `sourceTopicIds` → 400
  - Empty `sourceTopicIds` → 400
  - Invalid UUIDs → 400
  - Target in sourceTopicIds → 400
- ✅ Business logic errors
  - Target topic not found → 404
  - Source topic not found → 404
  - Name conflict → 409
- ✅ Database transaction integrity
  - Verify atomicity (all or nothing)
  - Verify no orphaned records
  - Verify foreign key constraints maintained

**Test Structure**:
```typescript
describe('POST /admin/api/topics/converge', () => {
  let testTargetTopic: Topic;
  let testSourceTopics: Topic[];

  beforeEach(async () => {
    // Create test topics with relationships
    testTargetTopic = await createTestTopic('Target Topic');
    testSourceTopics = await Promise.all([
      createTestTopic('Source 1'),
      createTestTopic('Source 2'),
    ]);
  });

  it('should converge topics successfully', async () => {
    const response = await request(app)
      .post('/admin/api/topics/converge')
      .send({
        targetTopicId: testTargetTopic.id,
        sourceTopicIds: testSourceTopics.map(t => t.id),
      })
      .expect(200);

    expect(response.body.migratedQuestions).toBeGreaterThan(0);
    expect(response.body.deletedTopics).toBe(2);

    // Verify database state
    const targetTopic = await findTopicById(testTargetTopic.id);
    expect(targetTopic).toBeDefined();
    
    const sourceTopics = await findTopicsByIds(testSourceTopics.map(t => t.id));
    expect(sourceTopics).toHaveLength(0);
  });

  it('should return 400 for invalid input', async () => {
    await request(app)
      .post('/admin/api/topics/converge')
      .send({ targetTopicId: 'invalid' })
      .expect(400);
  });
});
```

##### 5.2.2 Database Transaction Tests
**File**: `modules/db/src/repositories/__tests__/topicRepository.integration.test.ts` (NEW)

**Framework**: Jest + Real Prisma Client + Test Database

**Test Cases**:
- ✅ Full transaction flow with real database
- ✅ Verify data consistency after convergence
- ✅ Verify foreign key constraints
- ✅ Verify unique constraints (TopicArticle)
- ✅ Performance test with large datasets
- ✅ Concurrent convergence attempts (should be prevented or handled)

**Prerequisites**:
- Test database must be running
- Database cleanup between tests
- Use transactions that rollback after each test

#### 5.3 Component Integration Tests

##### 5.3.1 Topics Page Integration
**File**: `apps/web/app/admin/topics/__tests__/page.integration.test.tsx` (NEW)

**Framework**: Jest + React Testing Library + MSW (Mock Service Worker)

**Test Cases**:
- ✅ Topics page renders with convergence button
- ✅ Button enabled when 2+ topics selected
- ✅ Button disabled when < 2 topics selected
- ✅ Modal opens on button click
- ✅ Modal closes after successful convergence
- ✅ Topics list refreshes after convergence
- ✅ Selected topics cleared after convergence
- ✅ Error toast displayed on failure

**Test Structure**:
```typescript
describe('Topics Page Integration', () => {
  const server = setupServer(
    rest.get('/admin/api/topics', (req, res, ctx) => {
      return res(ctx.json(mockTopics));
    }),
    rest.post('/admin/api/topics/converge', (req, res, ctx) => {
      return res(ctx.json({ success: true }));
    }),
  );

  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should open convergence modal and submit', async () => {
    const user = userEvent.setup();
    render(<AdminTopics />);

    // Select topics
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    // Click converge button
    await user.click(screen.getByRole('button', { name: /converge/i }));

    // Verify modal opens
    expect(screen.getByText(/converge topics/i)).toBeInTheDocument();

    // Complete convergence flow
    // ...
  });
});
```

#### 5.4 End-to-End (E2E) Tests

##### 5.4.1 User Flow Tests
**File**: `apps/web/__tests__/e2e/topic-convergence.spec.ts` (NEW)

**Framework**: Playwright (or Cypress)

**Test Cases**:
- ✅ Complete convergence flow
  1. Navigate to admin topics page
  2. Select 2 topics
  3. Click "Converge Topics"
  4. Select target topic in modal
  5. Optionally rename/update description
  6. Review migration preview
  7. Confirm convergence
  8. Verify success message
  9. Verify topics list updated
  10. Verify source topics removed
- ✅ Error handling flow
  - Invalid topic selection
  - Name conflict error
  - Network error handling
- ✅ UI interactions
  - Modal open/close animations
  - Loading states
  - Form validation
  - Keyboard navigation

**Test Structure**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('Topic Convergence E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/admin/topics');
  });

  test('should complete full convergence flow', async ({ page }) => {
    // Select topics
    await page.check('input[type="checkbox"][value="topic-1"]');
    await page.check('input[type="checkbox"][value="topic-2"]');

    // Click converge button
    await page.click('button:has-text("Converge Topics")');

    // Verify modal opens
    await expect(page.locator('text=Converge Topics')).toBeVisible();

    // Select target topic
    await page.check('input[type="radio"][value="topic-1"]');

    // Confirm convergence
    await page.click('button:has-text("Confirm Convergence")');

    // Verify success
    await expect(page.locator('text=Topics converged successfully')).toBeVisible();

    // Verify topics list updated
    await expect(page.locator('text=topic-2')).not.toBeVisible();
  });
});
```

#### 5.5 Contract Tests

##### 5.5.1 API Contract Tests
**File**: `apps/web/app/admin/api/__tests__/topics/converge.contract.test.ts` (NEW)

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
  required: ['targetTopicId', 'sourceTopicIds'],
  properties: {
    targetTopicId: { type: 'string', format: 'uuid' },
    sourceTopicIds: {
      type: 'array',
      items: { type: 'string', format: 'uuid' },
      minItems: 1,
    },
    newName: { type: 'string', minLength: 1 },
    newDescription: { type: 'string' },
  },
};
```

#### 5.6 Performance Tests

##### 5.6.1 Database Performance Tests
**File**: `modules/db/src/repositories/__tests__/topicRepository.performance.test.ts` (NEW)

**Test Cases**:
- ✅ Convergence with 100+ questions
- ✅ Convergence with 1000+ TopicArticles
- ✅ Convergence with 100+ TimelineEvents
- ✅ Transaction duration < 5 seconds for typical case
- ✅ Memory usage during large convergence
- ✅ Database query count optimization

**Metrics to Track**:
- Execution time
- Database query count
- Memory usage
- Transaction duration

#### 5.7 Manual Testing Checklist

**Pre-Release Manual Testing**:
- [ ] **Basic Flow**
  - [ ] Select 2 topics and converge
  - [ ] Select 3+ topics and converge
  - [ ] Verify all questions migrated correctly
  - [ ] Verify all articles migrated (check for duplicates)
  - [ ] Verify timeline events migrated
  - [ ] Verify source topics deleted
  - [ ] Verify audit trail stored in target topic

- [ ] **Customization**
  - [ ] Rename target topic during convergence
  - [ ] Update description during convergence
  - [ ] Keep default name and description

- [ ] **Edge Cases**
  - [ ] Topics with no questions/articles/events
  - [ ] Topics with duplicate articles (already linked to target)
  - [ ] Topics with same name (rename required)
  - [ ] Large topics (100+ questions, 1000+ articles)

- [ ] **Error Cases**
  - [ ] Invalid topic IDs → error message
  - [ ] Name conflict → error message
  - [ ] Network error → error message
  - [ ] Database error → error message

- [ ] **UI/UX**
  - [ ] Modal opens/closes smoothly
  - [ ] Loading states display correctly
  - [ ] Success/error messages clear
  - [ ] Topics list refreshes after convergence
  - [ ] Selected topics cleared after convergence
  - [ ] Keyboard navigation works
  - [ ] Mobile responsive (if applicable)

- [ ] **Data Integrity**
  - [ ] No orphaned records after convergence
  - [ ] Foreign key constraints maintained
  - [ ] Unique constraints maintained (TopicArticle)
  - [ ] Audit trail accurate and complete

#### 5.8 Test Coverage Goals

**Target Coverage**:
- Repository layer: **90%+**
- Service layer: **85%+**
- API endpoints: **90%+**
- React components: **80%+**
- Hooks: **85%+**
- Integration tests: **All critical paths**
- E2E tests: **Main user flows**

**Coverage Tools**:
- Jest coverage reports (`--coverage`)
- Codecov or similar for CI/CD integration

#### 5.9 Test Execution Strategy

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

### Phase 6: Documentation

#### 6.1 User Documentation
- How to use the convergence feature
- When to use it
- What happens to the data
- Best practices

#### 6.2 Technical Documentation
- API endpoint documentation
- Database migration details
- Edge cases and handling

## Implementation Order

1. **Phase 1**: Database repository function (core logic)
2. **Phase 2**: API endpoint (backend interface)
3. **Phase 3**: Frontend UI (user interface)
4. **Phase 4**: Edge cases and refinements
5. **Phase 5**: Testing
6. **Phase 6**: Documentation

## Estimated Complexity

- **Database Layer**: Medium (transaction handling, duplicate management)
- **API Layer**: Low (validation + call repository)
- **Frontend UI**: Medium (modal, state management, UX)
- **Testing**: Medium (various edge cases)
- **Total**: ~2-3 days of development

## Future Enhancements

1. **Automatic Similarity Detection**: Suggest topics that might need convergence
2. **Undo Functionality**: Store enough data to reverse convergence
3. **Bulk Convergence**: Converge multiple groups at once
4. **Preview Mode**: Show what would happen without executing
5. **Convergence History**: View past convergences in admin

## Security Considerations

- Ensure only authenticated admin users can access
- Validate all inputs server-side
- Use transactions to prevent partial updates
- Log convergence actions for audit

