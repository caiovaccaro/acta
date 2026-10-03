> Historical crawler/Postgres intent doc. Local Postgres is Docker Compose; production is hosted Postgres (currently used by the Vercel web app).

# Acta Crawler + PostgreSQL Integration Spec

**Goal**  
Integrate PostgreSQL into the existing local Crawlee-based crawler so that:

1. PostgreSQL acts as the **canonical queue** of URLs to crawl.
2. PostgreSQL stores **extraction results** (articles, metadata, later LLM outputs).
3. Crawlee behaves as a **stateless worker** that processes batches from the DB.

This document is **directional** and intentionally avoids concrete code. It describes intent, responsibilities, and high-level steps.

---

## 1. Assumptions

- A Crawlee-based crawler is already running locally (fetching and processing URLs).
- The project uses Node.js and TypeScript.
- The architecture follows the monorepo pattern with:
  - `apps/crawler` for ingestion
  - `modules/db` (or equivalent) for database access
- PostgreSQL runs:
  - Locally via Docker Compose
  - In production as hosted Postgres

---

## 2. High-Level Design

**Key idea:**  
PostgreSQL becomes the **single source of truth** for:

- What URLs should be crawled (queue)
- What has been crawled (status)
- What was extracted (articles and metadata)

Crawlee is then used to:

- Fetch and parse URLs provided by the database
- Return extracted content
- Update the database with results

Conceptual data flow:

1. **RSS step** discovers URLs → writes them into a `crawl queue` table in PostgreSQL.
2. **Crawler job** reads pending entries from PostgreSQL → uses Crawlee to fetch and extract → writes results back → updates queue statuses.
3. **Downstream systems** (API, analytics, etc.) only read from PostgreSQL.

---

## 3. Step 1 — Introduce PostgreSQL into the Project

**Intent:**  
Have a running PostgreSQL instance accessible by the crawler.

**Requirements:**

- A local PostgreSQL instance for development.
- Connection configuration stored in environment variables (e.g. `DATABASE_URL`).
- A minimal schema defined for:
  - URL queue
  - Article results

**Actions (high level):**

- Set up a local PostgreSQL (e.g. container or local install).
- Define connection settings in a shared configuration module.
- Decide on a data access approach (ORM or query builder).

---

## 4. Step 2 — Define Conceptual Data Structures

**Intent:**  
Model the minimum tables needed for:

1. **Queue of URLs to crawl**
2. **Articles extracted from those URLs**

**Conceptual tables:**

1. **CrawlRequest**
   - Represents a single URL that should be crawled.
   - Example fields (names illustrative, not prescriptive):
     - Unique identifier
     - URL
     - Outlet identifier (which publication)
     - Status (e.g. `pending`, `in_progress`, `done`, `failed`)
     - Attempts count
     - Created/updated timestamps

2. **Article**
   - Represents the extracted article content and metadata.
   - Example fields:
     - Unique identifier
     - URL
     - Outlet identifier
     - Title
     - Body/content
     - Published date (if known)
     - Created timestamp

Later, additional fields (stance labels, embeddings, etc.) can be added, but are **not required** for this first integration step.

---

## 5. Step 3 — Use PostgreSQL as the Queue (RSS → DB)

**Intent:**  
Move from “RSS → Crawlee directly” to “RSS → PostgreSQL queue → Crawlee”.

**Current behaviour (assumed):**

- The crawler currently:
  - Reads one or more RSS feeds.
  - Immediately sends article URLs into Crawlee’s internal request queue.

**New behaviour:**

1. The RSS parsing step:
   - Reads RSS feeds for each outlet.
   - Extracts items (URL, title, published date, etc.).
2. For each item:
   - Normalize the URL.
   - Insert or upsert a row into the **CrawlRequest** table.
   - Set initial `status` to `pending`.
3. No direct interaction with Crawlee is done at this stage.

**Result:**  
The RSS step becomes a **pure discovery and queuing phase**, and PostgreSQL now holds the actionable queue.

---

## 6. Step 4 — Crawler Pulls Work from PostgreSQL

**Intent:**  
Make the crawler fetch batches of pending work from the DB instead of relying on an internal queue as the primary source of truth.

**Desired behaviour:**

1. **Select a batch of pending crawl requests** from PostgreSQL:
   - Filter by status (`pending`).
   - Apply a limit (batch size).
   - Optionally order by creation time or priority.

2. **Mark these entries as in progress**:
   - Update status from `pending` to `in_progress`.
   - Optionally increment an attempts counter.

3. **Prepare Crawlee inputs**:
   - For each selected request, prepare a crawl job with:
     - URL
     - Associated metadata (outlet and the crawl request id as a reference).

4. **Hand this batch to Crawlee**:
   - Crawlee runs and calls the extraction logic for each URL.
   - Crawlee should carry along the crawl request identifier (as context) to allow updates back into DB later.

**Result:**  
The crawler becomes a **consumer of DB work**, rather than the owner of the queue.

---

## 7. Step 5 — Persist Extraction Results

**Intent:**  
Store article content and metadata in PostgreSQL as normalized records.

**Desired behaviour in extraction logic:**

- For each successfully processed URL:
  - Build a structured representation of the extracted article:
    - URL
    - Title
    - Content/body
    - Publication date (if available)
    - Outlet (from context)
- Persist this into the **Article** table.
  - Create a new record if it does not exist.
  - Optionally update an existing record if this is a retry.

- Update the corresponding **CrawlRequest**:
  - Set status to `done`.
  - Optionally store processing timestamps.

**On failures:**

- If Crawlee fails to process a URL:
  - Update **CrawlRequest** status to `failed`.
  - Increment attempts.
  - Optionally store an error message or category for diagnostics.

---

## 8. Step 6 — Role of Crawlee’s Internal Queue

**Intent:**  
Clarify how Crawlee’s own queue coexists with PostgreSQL.

**Recommended approach for this phase:**

- Treat PostgreSQL as the **canonical queue**.
- Use Crawlee’s internal queue only for managing requests **within one batch run**.
  - For example, to handle transient retries or concurrency.
- Do **not** rely on Crawlee’s persistent storage as long-term state.
- Allow the crawler job to:
  - Start with a clean internal queue.
  - Fill it from the DB batch.
  - Run extraction.
  - Exit.

**Result:**  
Crawlee remains a stateless worker for each run, while PostgreSQL tracks long-lived queue state.

---

## 9. Step 7 — Periodic Execution (Intervals)

**Intent:**  
Run the crawler in **intervals** instead of continuously, using the DB as the stable backbone.

**Execution model:**

Each scheduled run (e.g. via cron, GitHub Actions, or a platform scheduler) performs:

1. **RSS refresh phase**
   - Fetch RSS feeds.
   - Insert new URLs into **CrawlRequest** as `pending`.

2. **Crawl phase**
   - Select a set of `pending` requests from PostgreSQL.
   - Mark them as `in_progress`.
   - Run Crawlee over this batch.
   - Store results in **Article** and update **CrawlRequest** statuses.

3. Exit.

**Benefits:**

- Simple to reason about.
- Safe to run repeatedly.
- Scales by adjusting batch sizes and run frequency.

---

## 10. Step 8 — Validation Checklist

To verify the integration works correctly:

1. **Connectivity**
   - The crawler can reach PostgreSQL using the environment configuration.
   - Basic read/write tests succeed.

2. **Queue population**
   - After RSS phase, new `CrawlRequest` rows appear with `pending` status.
   - URL uniqueness is enforced according to desired rules.

3. **Processing flow**
   - The crawl job moves some `CrawlRequest` rows to `in_progress` and then to `done` or `failed`.
   - `Article` rows are created with appropriate fields.

4. **Idempotence**
   - Re-running the RSS + crawl job does not create duplicate articles.
   - Previously completed URLs are not reprocessed unless explicitly desired.

5. **Monitoring**
   - Basic logs or metrics show:
     - Number of new URLs discovered.
     - Number of URLs processed.
     - Number of failures.

---

## 11. Summary

This integration design:

- Promotes PostgreSQL as the **system of record** for both crawl state and extracted content.
- Keeps Crawlee as a **stateless executor** that can be scaled or replaced without losing state.
- Prepares the way for later stages (stance labeling, consensus calculation, embeddings) by already centralizing all article data in the database.

All agents working on the crawler, database, or API should preserve this separation of concerns:

- **DB**: truth about work and results  
- **Crawler**: worker  
- **RSS**: discovery  

Further schema extensions (LLM outputs, embeddings, consensus snapshots) should build upon this foundation rather than replace it.
