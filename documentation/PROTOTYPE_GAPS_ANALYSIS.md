# Prototype Gaps Analysis & Implementation Proposal

**Date**: 2025-01-27  
**Reference**: [Acta Prototype](https://acta-prototype.vercel.app/#/)  
**Prototype Code**: `_prototype2/` folder

## Overview

This document identifies the gaps between the current implementation and the prototype design, and proposes solutions to bridge them.

**Priority**: Implement all changes (no phased approach)

---

## 1. Home Page: Topic-Based Cards Instead of Questions

### Current State
- Home page displays individual `QuestionCard` components
- Each card shows a single question with its verdict
- No grouping by topic

### Prototype Requirement
- Home page should display **topic cards** (e.g., "ISRAEL & GAZA", "AI & REGULATION")
- Each topic card shows:
  - Topic name as eyebrow
  - **Main/primary question** for that topic (not all questions)
  - Verdict for the main question
  - **2-3 sentence description** of the issue (currently missing)
  - Publication logos and count
  - "Read →" link to topic detail page

### Proposed Solution

#### Backend Changes
1. **Main Question Selection Logic**:
   - **Default**: Select question with highest number of articles AND publications
   - **Override**: Admin can set `mainQuestionId` on Topic model to override default
   - Query: Count `ArticleStance` records per question, then count unique outlets

2. **Topic Model Enhancement**:
   ```prisma
   model Topic {
     // ... existing fields
     mainQuestionId String? // Optional: admin override for main question
     @@index([mainQuestionId])
   }
   ```

3. **Question Context Blurb Generation** (NEW):
   - Generate 2-3 sentence description about the **question context** (not topic description)
   - Use LLM to generate from article content for that question
   - This is question-specific context, explaining what the question is about
   - Can be stored in Question model or generated on-demand
   - **Not** the topic description - this is question-specific
   
   **Database Option**:
   ```prisma
   model Question {
     // ... existing fields
     contextBlurb String? @db.Text // LLM-generated 2-3 sentence context
   }
   ```
   
   **LLM Generation**:
   - New function in `openaiProvider.ts`:
     ```typescript
     generateQuestionContextBlurb(question: Question, articles: Article[]): Promise<string>
     ```
   - Prompt: "Generate a 2-3 sentence context blurb explaining what this question is about, based on these articles. Focus on the question context, not the topic description."

4. **Service Layer** (`apps/api/src/services/topicsService.ts`):
   - Update `getAllTopics()` to:
     - Calculate main question: highest article+publication count, or use `mainQuestionId` if set
     - Generate/retrieve question context blurb (2-3 sentences) via LLM
     - Include publication count/outlets for the main question

#### Frontend Changes
1. **Home Page** (`apps/web/app/page.tsx`):
   - Replace `useQuestions()` with `useTopics()` hook
   - Replace `QuestionCard` with `TopicCard` component
   - Update section title from "Featured Questions" to "Featured Topics"
   - Follow layout and copy patterns from `_prototype2/pages/Home.tsx`:
     - Hero section structure
     - \"Featured Debates\" heading and subtitle
     - Card grid behavior and spacing

2. **TopicCard Component** (`apps/web/app/components/TopicCard.tsx`):
   - Already exists and mostly correct
   - **Update**: Display **question context blurb** (2-3 sentences) instead of topic description
   - **Enhance**: Show actual publication logos (currently placeholder)
   - **Verify**: Main question display logic (should use calculated main question, not just first)
   - Reference: `_prototype2/components/TopicCard.tsx` for exact styling

---

## 2. Topic Detail Page: Show Main Question + All Other Questions

### Current State
- Topic detail page (`/topics/[id]`) shows only the **first question** in detail
- No list of all questions for the topic

### Prototype Requirement
- **Two separate pages**:
  1. **Topic Page** (`/topics/[id]`): Shows topic header, main question prominently, then all other questions in grid
  2. **Question Detail Page** (`/questions/[id]`): Shows full question detail with all sections

- Topic page structure (from `_prototype2/pages/TopicPage.tsx`):
  - Topic name as large header
  - Topic description
  - "Main Debate" section with main question as featured card
  - "More Questions in this Topic" section with grid of other questions

### Proposed Solution

#### Backend Changes
- Already implemented: `getTopicById()` returns `TopicDetailDTO` with `questions: QuestionSummaryDTO[]`
- Need to identify main question (same logic as home page)

#### Frontend Changes
1. **Topic Page** (`apps/web/app/topics/[id]/page.tsx`):
   - **Restructure** to match `_prototype2/pages/TopicPage.tsx`:
     - Large topic name header
     - Topic description
     - "Main Debate" section with main question as featured `TopicCard`
     - "More Questions" section with grid of other questions as `TopicCard` components
   - Main question links to `/questions/[id]`
   - Other questions also link to their respective `/questions/[id]` pages

2. **Question Detail Page** (`apps/web/app/questions/[id]/page.tsx`):
   - Keep current structure (this is the detailed view)
   - Add breadcrumb/link back to topic page

---

## 3. Understand Box: Format as Bullet Points

### Current State
- "Understand" box exists and displays `debateCard.overview`
- Currently shows as plain text with `whitespace-pre-line`
- Content is a single paragraph

### Prototype Requirement
- "Understand" box should display **bullet points** (3-5 bullets)
- Each bullet explains a key aspect of the context
- Format: `• Bullet point text`

### Proposed Solution

#### Backend Changes
1. **Debate Service** (`apps/api/src/services/debateService.ts`):
   - Update `getDebateCard()` to generate overview as **array of bullet points**
   - Use LLM to generate **comprehensive but not extensive** bullet list
   - Consider points from different articles that contributed to the verdict
   - Not limited to 3 bullets - generate as many as needed for comprehensive overview

2. **DTO Update** (`modules/shared/src/dto/debate.dto.ts`):
   ```typescript
   export interface DebateCardDTO {
     // ... existing fields
     overview: string; // Keep for backward compatibility
     overviewBullets: string[]; // Array of bullet point strings (required)
   }
   ```

3. **LLM Prompt Enhancement**:
   - Modify prompt in `openaiProvider.ts` to request comprehensive bullet points:
     ```
     Generate a comprehensive but not extensive bullet list that gives an overview 
     of the question at hand, considering points from different articles that 
     contributed to this verdict.
     
     Return a JSON object with:
     {
       "overviewBullets": [
         "Bullet point 1 explaining key context from articles",
         "Bullet point 2 explaining another aspect from different perspectives",
         "Bullet point 3 explaining a third aspect",
         // ... generate as many as needed for comprehensive overview
       ]
     }
     ```
   - Include article reasoning/stances in the prompt so LLM can synthesize different perspectives

#### Frontend Changes
1. **Topic/Question Detail Pages**:
   - Update "Understand" box to render bullets:
     ```tsx
     {debateCard?.overviewBullets && debateCard.overviewBullets.length > 0 && (
       <div className="rounded-xl border border-border-light bg-white p-6 md:p-8 shadow-sm">
         <h2 className="text-xl font-bold mb-4 text-text-main">Understand</h2>
         <ul className="space-y-3 text-text-muted leading-relaxed">
           {debateCard.overviewBullets.map((bullet, i) => (
             <li key={i} className="flex items-start gap-2">
               <span className="text-primary-blue mt-1">•</span>
               <span>{bullet}</span>
             </li>
           ))}
         </ul>
       </div>
     )}
     ```

---

## 4. Quotes: Actual Quotes from Majority-Aligned Articles

### Current State
- "Summaries" section shows `debateCard.argumentsFor` (top 3)
- These are extracted from article reasoning, often starting with "the article is..."
- Not actual quotes from the articles

### Prototype Requirement
- **Rename**: "Summaries" → "Quotes"
- Quotes should be **actual quotes** from articles (not summaries)
- Quotes should be from articles that **align with the majority stance**
- If verdict is "Yes, it seems so", quotes should be from articles with "Yes" stances
- If verdict is "No, it doesn't seem so", quotes should be from articles with "No" stances
- Format: `"Actual quote text from article"` - Publication Name

### Proposed Solution

#### Backend Changes
1. **Quote Extraction** (NEW):
   - Extract actual quotes from article text content
   - Use LLM to identify compelling quotes that support the stance
   - Filter to only quotes from articles whose stance aligns with verdict
   - Store quotes with article attribution

2. **Debate Service** (`apps/api/src/services/debateService.ts`):
   - Add `quotes` field to `DebateCardDTO` (replace or supplement `argumentsFor`)
   - In `getDebateCard()`, accept `verdictLabel` parameter
   - Extract quotes from article text content using LLM:
     ```typescript
     // For each article with stance aligned to verdict:
     // 1. Use LLM to extract 1-2 compelling quotes from article text
     // 2. Filter quotes that support the stance
     // 3. Return top 3-5 quotes
     ```
   - Filter quotes based on verdict alignment

3. **LLM Quote Extraction**:
   - New function in `openaiProvider.ts`:
     ```typescript
     extractQuotes(articleText: string, question: string, stance: Stance): Promise<string[]>
     ```
   - Prompt: "Extract 1-2 compelling direct quotes from this article that support [stance] for the question: [question]. Return only actual quotes, not summaries."

4. **DTO Update** (`modules/shared/src/dto/debate.dto.ts`):
   ```typescript
   export interface QuoteDTO {
     id: string;
     text: string; // Actual quote text
     articleId: string;
     articleTitle: string;
     articleUrl: string;
     outletName: string;
   }
   
   export interface DebateCardDTO {
     // ... existing fields
     quotes: QuoteDTO[]; // Renamed from argumentsFor, actual quotes
     // Keep argumentsFor for backward compatibility if needed
   }
   ```

#### Frontend Changes
1. **Topic/Question Detail Pages**:
   - **Rename section**: "Summaries" → "Quotes"
   - Update to display actual quotes:
     ```tsx
     {debateCard?.quotes && debateCard.quotes.length > 0 && (
       <div className="border-t border-border-light pt-8">
         <div className="mb-6 flex items-center gap-3">
           <QuoteIcon ... />
           <h3 className="text-lg font-bold text-text-main">Quotes</h3>
         </div>
         <div className="space-y-6">
           {debateCard.quotes.map((quote, i) => (
             <div key={i} className="flex flex-col gap-3">
               <blockquote className="text-base text-text-muted italic leading-relaxed border-l-2 border-primary-blue/30 pl-3">
                 "{quote.text}"
               </blockquote>
               <div className="flex items-center gap-2 pl-3">
                 <img src={getOutletLogoUrl(quote.outletName)} ... />
                 <span className="text-xs font-bold text-text-main">{quote.outletName}</span>
               </div>
             </div>
           ))}
         </div>
       </div>
     )}
     ```

#### Frontend Changes
- No changes needed if backend filtering is implemented correctly
- Current display logic already handles `argumentsFor` array

---

## 5. Points for Debate: Show Opposing Arguments

### Current State
- "Points for debate" section shows `debateCard.unknowns`
- Currently displays generic "Additional data may be needed" message
- Not showing actual opposing arguments

### Prototype Requirement
- "Some points for debate" should show **summary sentences from articles with opposing stances**
- If verdict is "Yes", show points from "No" stance articles
- Each point should be attributed to a publication
- Format: `"Point text" - Publication Name`

### Proposed Solution

#### Backend Changes
1. **Debate Service** (`apps/api/src/services/debateService.ts`):
   - Update logic to populate `unknowns` with **opposing arguments**:
     ```typescript
     // If verdict is Yes/ProbablyYes, use argumentsAgainst
     // If verdict is No/ProbablyNot, use argumentsFor
     // Extract top 2-3 opposing arguments
     ```
   - Map `argumentsAgainst` or `argumentsFor` (depending on verdict) to `UnknownDTO[]`
   - Include outlet attribution

2. **DTO Update** (if needed):
   - `UnknownDTO` already has structure, but may need to ensure it includes outlet info
   - Currently `UnknownDTO` has `articleId` but not `outletName` - may need to add

#### Frontend Changes
1. **Topic/Question Detail Pages**:
   - Update "Points for debate" section to show outlet attribution:
     ```tsx
     {debateCard?.unknowns && debateCard.unknowns.length > 0 && (
       <div className="border-t border-border-light pt-8">
         <h3 className="text-lg font-bold text-text-main mb-6">Some points for debate</h3>
         <div className="space-y-6">
           {debateCard.unknowns.map((point, i) => (
             <div key={i} className="flex flex-col gap-2">
               <p className="text-base text-text-muted leading-relaxed">
                 {point.text}
               </p>
               {point.outletName && (
                 <div className="flex items-center gap-2">
                   <img src={getOutletLogoUrl(point.outletName)} ... />
                   <span className="text-xs font-bold text-text-main">{point.outletName}</span>
                 </div>
               )}
             </div>
           ))}
         </div>
       </div>
     )}
     ```

---

## 6. Featured Perspective: Highlighted Quote

### Current State
- **Missing**: No "Featured Perspective" section exists

### Prototype Requirement
- Display a **featured perspective** card
- Shows a quote from a journalist/publication
- Includes outlet logo and name
- Positioned prominently (e.g., between "Understand" and "Quotes" sections)

### Proposed Solution

#### Backend Changes
1. **Debate Service** (`apps/api/src/services/debateService.ts`):
   - Add `featuredPerspective` field to `DebateCardDTO`:
     ```typescript
     featuredPerspective?: {
       id: string;
       text: string;
       outletName: string;
       articleId: string;
       articleTitle: string;
     } | null;
     ```
   - Selection logic:
     - Choose the article with highest confidence from majority-aligned articles
     - Or select based on outlet credibility/weight
     - Extract a compelling quote from the reasoning

2. **DTO Update** (`modules/shared/src/dto/debate.dto.ts`):
   ```typescript
   export interface FeaturedPerspectiveDTO {
     id: string;
     text: string;
     outletName: string;
     articleId: string;
     articleTitle: string;
   }
   
   export interface DebateCardDTO {
     // ... existing fields
     featuredPerspective?: FeaturedPerspectiveDTO | null;
   }
   ```

#### Frontend Changes
1. **Topic/Question Detail Pages**:
   - Add "Featured Perspective" section:
     ```tsx
     {debateCard?.featuredPerspective && (
       <div className="rounded-xl border border-border-light bg-white p-6 md:p-8 shadow-sm">
         <h3 className="text-lg font-bold text-text-main mb-4">Featured Perspective</h3>
         <blockquote className="text-base text-text-muted italic leading-relaxed mb-4">
           "{debateCard.featuredPerspective.text}"
         </blockquote>
         <div className="flex items-center gap-2">
           <img src={getOutletLogoUrl(debateCard.featuredPerspective.outletName)} ... />
           <span className="text-sm font-bold text-text-main">
             {debateCard.featuredPerspective.outletName}
           </span>
         </div>
       </div>
     )}
     ```

---

## 7. Context Timeline: Chronological Events

### Current State
- **Missing**: No timeline data or display exists

### Prototype Requirement
- Display a **"Key Context Timeline"** section
- Shows chronological events related to the topic/question
- Each event has:
  - Date (e.g., "OCT 7, 2023")
  - Title (e.g., "Conflict Escalation")
  - Description
  - Color-coded dot (based on verdict alignment if applicable)

### Proposed Solution

#### Backend Changes
1. **Database Schema** (`modules/db/prisma/schema.prisma`):
   ```prisma
   model TimelineEvent {
     id          String   @id @default(uuid())
     topicId     String?  // Optional: can be topic-specific
     questionId  String?  // Optional: can be question-specific
     date        DateTime
     title       String
     description String   @db.Text
     order       Int      // For sorting
     createdAt   DateTime @default(now())
     updatedAt   DateTime @updatedAt
     
     topic       Topic?    @relation(fields: [topicId], references: [id])
     question    Question? @relation(fields: [questionId], references: [id])
     
     @@index([topicId])
     @@index([questionId])
     @@map("timeline_events")
   }
   ```

2. **Timeline Service** (`apps/api/src/services/timelineService.ts` - NEW):
   ```typescript
   export async function generateTimelineEvents(
     topicId?: string,
     questionId?: string
   ): Promise<TimelineEventDTO[]> {
     // 1. Get all articles for topic/question
     // 2. Use LLM to extract key dates/events from article content
     // 3. Generate timeline events with dates, titles, descriptions
     // 4. Store in database
     // 5. Return DTOs
   }
   
   export async function getTimelineEvents(
     topicId?: string,
     questionId?: string
   ): Promise<TimelineEventDTO[]> {
     // Query existing timeline events from database
     // If none exist, generate them
     // Sort by date
     // Return DTOs
   }
   ```

3. **LLM Timeline Generation**:
   - New function in `openaiProvider.ts`:
     ```typescript
     generateTimelineEvents(articles: Article[], question: Question): Promise<TimelineEvent[]>
     ```
   - Prompt: "Analyze these articles and extract key chronological events related to [question]. For each event, provide: date, title, and description. Return as JSON array."

3. **Data Generation**: **LLM-Generated**
   - Use LLM to analyze articles for a topic/question
   - Extract key dates and events from article content
   - Generate timeline events with dates, titles, descriptions
   - Store in database for persistence
   - Regenerate periodically as new articles are added

4. **API Endpoint**: `GET /api/timeline?topicId=...&questionId=...`

#### Frontend Changes
1. **Timeline Component** (`apps/web/app/components/Timeline.tsx` - NEW):
   - Create reusable timeline component
   - Display events vertically with connecting lines
   - Color-code dots based on date/event type

2. **Topic/Question Detail Pages**:
   - Add timeline section:
     ```tsx
     {timelineEvents && timelineEvents.length > 0 && (
       <div className="rounded-xl border border-border-light bg-white p-6 md:p-8 shadow-sm">
         <h2 className="text-xl font-bold mb-6 text-text-main">Key Context Timeline</h2>
         <Timeline events={timelineEvents} />
       </div>
     )}
     ```

3. **Hook** (`apps/web/lib/hooks/useTimeline.ts` - NEW):
   - Fetch timeline events from API

---

## 8. Next Cause/Topic/Question Link

### Current State
- **Missing**: No navigation to next topic/question at bottom of pages

### Prototype Requirement
- Display a **"NEXT CAUSE"** card at the bottom of topic/question detail pages
- Shows the next topic/question in sequence
- Includes question text and "Read Next →" link

### Proposed Solution

#### Backend Changes
1. **Topics Service** (`apps/api/src/services/topicsService.ts`):
   - Add `getNextTopic(currentTopicId: string): Promise<TopicDTO | null>`
   - Logic: Get next topic by creation date or priority order

2. **Questions Service** (`apps/api/src/services/questionsService.ts`):
   - Add `getNextQuestion(currentQuestionId: string): Promise<QuestionCardDTO | null>`
   - Logic: Get next question (could be next in topic, or next topic's main question)

#### Frontend Changes
1. **Next Cause Component** (`apps/web/app/components/NextCause.tsx` - NEW):
   ```tsx
   interface NextCauseProps {
     currentTopicId?: string;
     currentQuestionId?: string;
   }
   
   export default function NextCause({ currentTopicId, currentQuestionId }: NextCauseProps) {
     // Fetch next topic/question
     // Display card with link
   }
   ```

2. **Topic/Question Detail Pages**:
   - Add at bottom:
     ```tsx
     <NextCause 
       currentTopicId={topicId} 
       currentQuestionId={questionId} 
     />
     ```

---

## Implementation Priority

**All changes should be implemented** (no phased approach). Order of implementation:

1. **Home page**: Topic-based cards with main question selection
2. **Question context blurb**: LLM generation for card descriptions
3. **Topic page**: Restructure to show main question + all questions grid
4. **Understand box**: Comprehensive bullet points (LLM-generated)
5. **Quotes**: Extract actual quotes from articles (LLM-generated, filtered by majority)
6. **Points for debate**: Show opposing arguments with outlet attribution
7. **Featured perspective**: Highlighted quote section
8. **Context timeline**: LLM-generated chronological events
9. **Next cause link**: Navigation to next topic/question

---

## Summary of Required Changes

### Backend
- [ ] Add `mainQuestionId String?` field to Topic model (admin override)
- [ ] Implement main question selection logic:
  - Default: Question with highest article count AND publication count
  - Override: If `mainQuestionId` is set, use that question
  - Query: Count `ArticleStance` records per question, count unique outlets, select max
- [ ] Create LLM function to generate question context blurb (2-3 sentences)
- [ ] Update `topicsService.ts` to include main question and context blurb
- [ ] Update `debateService.ts` to generate comprehensive bullet points for overview
- [ ] Create LLM function to extract actual quotes from article text
- [ ] Update `debateService.ts` to extract and filter quotes by majority alignment
- [ ] Rename "Summaries" to "Quotes" in DTOs and services
- [ ] Update `debateService.ts` to populate "points for debate" with opposing arguments
- [ ] Add `featuredPerspective` to `DebateCardDTO` and generation logic
- [ ] Create `timelineService.ts` with LLM generation function
- [ ] Add `TimelineEvent` model to database schema
- [ ] Add `getNextTopic()` and `getNextQuestion()` functions

### Frontend
- [ ] Update home page to use topics instead of questions
- [ ] Update `TopicCard` to display question context blurb (not topic description)
- [ ] Restructure topic page (`/topics/[id]`) to match prototype (main question + grid)
- [ ] Format "Understand" box as comprehensive bullet points
- [ ] Rename "Summaries" section to "Quotes"
- [ ] Update quotes display to show actual quotes (not summaries)
- [ ] Add outlet attribution to "Points for debate"
- [ ] Add "Featured Perspective" section
- [ ] Create timeline component and integration
- [ ] Create "Next Cause" component

### Database
- [ ] Add `mainQuestionId String?` to Topic model
- [ ] Add `TimelineEvent` model with fields: id, topicId?, questionId?, date, title, description, order

---

## Notes

- **Main Question Selection**: Default to highest article+publication count, but allow admin override via `mainQuestionId`
- **Question Context Blurb**: Must be LLM-generated from article content, not topic description. This is question-specific context.
- **Topic Page Structure**: Reference `_prototype2/pages/TopicPage.tsx` for exact layout (main question featured, then grid of others)
- **Understand Bullets**: Should be comprehensive but not extensive. LLM should consider different article perspectives.
- **Quotes**: Must be actual quotes extracted from article text, not summaries. Use LLM to extract compelling quotes.
- **Timeline**: LLM-generated from article content. Extract key dates and events chronologically.
- **All Features**: Implement all changes (no phased approach)
- Consider adding admin UI for:
  - Overriding main question selection
  - Regenerating question context blurbs
  - Regenerating timeline events

