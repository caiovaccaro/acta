# Design

## Context

Public `/api/health` is a liveness probe. Operational detail belongs behind
the existing admin session cookie.

## Decisions

### 1. Partial failure is unknown

Each section is loaded independently. A failed query is `unknown`, never
healthy.

### 2. Stale thresholds

A heartbeat older than 15 minutes or a last finished run older than 48 hours
is stale.

### 3. Public health stays minimal

Public responses never include queues, moderation, or budget.

```text
Admin session -> /admin/api/health -> loadOperationalHealth
                                      |-- pipeline_runs
                                      |-- crawl_requests
                                      |-- topics/questions
                                      '-- llm budget remaining
```

## Test Mapping

- **Unit:** authorization, stale thresholds, redaction.
- **Integration:** real records; authenticated vs unauthenticated payloads.
- **E2E:** owner UI reports stale state, queues, moderation, and budget.
