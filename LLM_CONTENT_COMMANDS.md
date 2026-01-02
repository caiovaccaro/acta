# Acta Content Generation Commands

Complete workflow from crawling articles to generating all LLM content.

## 1. Crawling & Ingestion

### Start Crawler (Main Ingestion)
```bash
npm run crawler:start
# or
npm start
```
Main crawler job that:
- Fetches RSS feeds from configured outlets
- Creates crawl requests in the database
- Processes pending crawl requests in batches
- Extracts article content using Mozilla Readability
- Stores articles in PostgreSQL

---

## 2. Topics & Questions Setup

**⚠️ Important:** Topics and questions must exist before analyzing articles, as analysis classifies articles against questions.

### Option A: Manual Seeding (Initial Setup from PRD)
```bash
npm run db:seed:topics           # Creates initial topics: Gaza, Drug Policy, AI Regulation
npm run db:seed:questions       # Creates pre-defined questions and validates them
```
**Use when:** Setting up initial topics/questions from PRD. `seed:questions` automatically validates questions and may reformulate them to meet quality standards.

### Option B: LLM Discovery (From Crawled Articles)
```bash
# After crawling articles, discover topics
npm run db:discover:topics       # Discover new topics from recent articles (creates in "pending" status)

# Approve discovered topics
npm run db:approve:topic -- --topicId=<id>  # Approve each discovered topic

# Discover questions for approved topics
npm run db:discover:questions   # Discover new questions for approved topics (creates in "pending" status)
```
**Use when:** Automatically finding new topics/questions from crawled articles. Discovered items require approval/validation before use.

---

## 3. Article Analysis

### Analyze Articles
```bash
npm run crawler:analyze
# or (alias)
npm run analyze:articles
```
Analyzes articles and:
- Classifies stances for article-question pairs
- Creates article-question relationships
- Generates article analysis attempts

**Note:** Both `crawler:analyze` and `analyze:articles` are aliases for the same command.

**⚠️ Prerequisites:** Topics and questions must exist before running analysis.

### Export Utilities (Optional)
```bash
# Export articles from database to CSV/JSON
npm run crawler:export:articles

# Export RSS metadata (crawl requests) to CSV/JSON
npm run crawler:export:rss
```
These are data export utilities, not part of the ingestion pipeline.

---

## 4. Database & Verdicts

### Calculate Verdicts
```bash
npm run db:calculate:verdicts
```
Calculates monthly verdicts for all questions based on article stances.

### Summarize Verdicts
```bash
npm run db:summarize:verdicts
```
Generates reasoning summaries for calculated verdicts.

---

## 5. LLM Content Generation

### Generate Context Blurbs
```bash
# Generate for all questions
npm run db:generate:context-blurbs

# Generate for specific question
npm run db:generate:context-blurbs -- --question-id=<question-id>

# Generate for specific topic
npm run db:generate:context-blurbs -- --topic-id=<topic-id>
npm run db:generate:context-blurbs -- --topic-name="Gaza"

# Force regenerate (even if blurb exists)
npm run db:generate:context-blurbs -- --force
```
Generates 2-3 sentence context blurbs for questions.

### Generate Timeline Events
```bash
# Generate for all questions/topics
npm run db:generate:timeline-events

# Generate for specific question
npm run db:generate:timeline-events -- --question-id=<question-id>

# Generate for specific topic
npm run db:generate:timeline-events -- --topic-id=<topic-id>

# Force regenerate
npm run db:generate:timeline-events -- --force
```
Generates chronological timeline events from articles.

### Generate Featured Perspectives
```bash
# Generate for all questions
npm run db:generate:featured-perspectives

# Generate for specific question
npm run db:generate:featured-perspectives -- --question-id=<question-id>

# Generate for specific topic
npm run db:generate:featured-perspectives -- --topic-id=<topic-id>

# Force regenerate
npm run db:generate:featured-perspectives -- --force
```
Generates featured perspective quotes from aligned articles (always includes article URL).

### Generate Debate Card Content
```bash
# Generate for all questions
npm run db:generate:debate-content

# Generate for specific question
npm run db:generate:debate-content -- --question-id=<question-id>

# Generate for specific topic
npm run db:generate:debate-content -- --topic-id=<topic-id>

# Force regenerate
npm run db:generate:debate-content -- --force
```
Generates all debate card content:
- Overview bullets (for "Understand" section)
- Quotes from supporting articles
- Featured perspective
- Points for debate (quotes from opposing articles)

---

## 6. Complete Workflow (Top to Bottom)

### Full Pipeline (From Scratch)
```bash
# 1. Crawl articles from RSS feeds
npm run crawler:start

# 2. Set up topics and questions (choose one option)

# Option A: Manual seeding (from PRD)
npm run db:seed:topics
npm run db:seed:questions

# Option B: LLM discovery (from articles)
npm run db:discover:topics
npm run db:approve:topic -- --topicId=<id>  # Repeat for each topic
npm run db:discover:questions

# 3. Analyze articles (classify stances, create relationships)
# ⚠️ Topics and questions must exist before this step
npm run crawler:analyze
# or: npm run analyze:articles

# 4. Calculate verdicts
npm run db:calculate:verdicts

# 5. Summarize verdicts
npm run db:summarize:verdicts

# 6. Generate all LLM content
npm run db:generate:context-blurbs -- --force
npm run db:generate:timeline-events -- --force
npm run db:generate:featured-perspectives -- --force
npm run db:generate:debate-content -- --force
```

### Regenerate Only LLM Content (if articles/verdicts already exist)
```bash
npm run db:generate:context-blurbs -- --force
npm run db:generate:timeline-events -- --force
npm run db:generate:featured-perspectives -- --force
npm run db:generate:debate-content -- --force
```

### Regenerate for Specific Topic
```bash
# Replace "Gaza" with your topic name
npm run db:generate:context-blurbs -- --topic-name="Gaza" --force
npm run db:generate:timeline-events -- --topic-id=<topic-id> --force
npm run db:generate:featured-perspectives -- --topic-id=<topic-id> --force
npm run db:generate:debate-content -- --topic-id=<topic-id> --force
```

### Regenerate for Specific Question
```bash
# Replace <question-id> with actual ID
npm run db:generate:context-blurbs -- --question-id=<question-id> --force
npm run db:generate:timeline-events -- --question-id=<question-id> --force
npm run db:generate:featured-perspectives -- --question-id=<question-id> --force
npm run db:generate:debate-content -- --question-id=<question-id> --force
```

---

## 7. Utility Commands

### Database Management
```bash
npm run db:studio          # Open Prisma Studio (database GUI)
npm run db:migrate         # Run database migrations (development)
npm run db:migrate:deploy  # Deploy migrations (production)
npm run db:generate        # Regenerate Prisma client
npm run db:health          # Check database connection
npm run db:reset           # Reset database (WARNING: deletes all data)
```

### Topic & Question Management

**Note:** These commands are also used in the main workflow (see Section 2), but listed here for reference.

#### Manual Seeding
```bash
npm run db:seed:topics           # Create initial topics from PRD (Gaza, Drug Policy, AI Regulation)
npm run db:seed:questions       # Create pre-defined questions from PRD and validate them
```
**Note:** These create hardcoded topics and questions from the PRD. `seed:questions` automatically validates questions and may reformulate them to meet quality standards.

#### Reactive Discovery (LLM-based from Articles)
```bash
npm run db:discover:topics      # Discover new topics from recent articles (creates in "pending" status)
npm run db:discover:questions   # Discover new questions for approved topics (creates in "pending" status)
```
**Note:** These use LLM to automatically discover topics/questions from articles. Discovered items are created in "pending" status and require approval/validation before use.

#### Moderation & Validation
```bash
npm run db:approve:topic -- --topicId=<id>        # Approve a discovered topic
npm run db:reject:topic -- --topicId=<id>          # Reject a discovered topic
npm run db:validate:bar-questions                  # Validate questions for bar conversation suitability
npm run db:revert:bar-reformulations               # Revert questions reformulated by bar validation
```
**Note:** 
- `db:validate:bar-questions` validates questions to check if they're simple and conversational enough to be asked in a bar conversation. It scores questions (0-100) and suggests reformulations but doesn't automatically apply them. This is a quality assurance tool, not part of the content generation pipeline.
- `db:revert:bar-reformulations` reverts questions that were reformulated during bar validation back to their original text.

#### Verdict Debugging & Inspection
```bash
npm run db:log:verdict-reasoning                    # Log all verdict reasoning
npm run db:log:verdict-reasoning -- --questionId=<id>  # Log reasoning for specific question
npm run db:log:verdict-reasoning -- --topicId=<id>      # Log reasoning for specific topic
npm run db:log:verdict-reasoning -- --include-articles  # Include article details
```
**Note:** This is a debugging/inspection tool to view verdict reasoning in a readable format. Not part of the content generation pipeline.

---

## Notes

- **Force Flag**: Use `--force` to regenerate content even if it already exists
- **Topic Filtering**: Use `--topic-name` or `--topic-id` to filter by topic
- **Question Filtering**: Use `--question-id` to process a specific question
- **Order Matters**: 
  - Topics and questions must exist before analyzing articles
  - Verdicts must be calculated before generating debate content
- **Article Requirements**: All LLM generation requires articles with analyzed stances

---

## Quick Reference

| Content Type | Command | Requires |
|-------------|---------|----------|
| Context Blurbs | `db:generate:context-blurbs` | Articles |
| Timeline Events | `db:generate:timeline-events` | Articles |
| Featured Perspectives | `db:generate:featured-perspectives` | Verdicts, Articles |
| Debate Content | `db:generate:debate-content` | Verdicts, Articles |

