# Design

## Context

Section 12 of the Phase 1 plan. GitHub's hard job limit is six hours; the
application deadline is 285 minutes inside a 330-minute job.

## Decisions

### 1. Concurrency does not cancel

`cancel-in-progress: false`. A second trigger waits or exits after failing to
acquire `production-pipeline`.

### 2. Dispatch inputs are bounded integers

Only `scheduled|manual|retry` and positive caps ≤ 500. Unsafe shell characters
are rejected by the validator used in tests.

### 3. Email is best-effort

Native GitHub failure notification remains if Resend cannot send.

## Test Mapping

- **Unit:** YAML policy and safe dispatch inputs.
- **Integration:** generate / migrate-equivalent / one slice without secret
  output.
- **E2E:** capped manual slice persists progress and sends a receipt.
