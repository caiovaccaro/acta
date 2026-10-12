# Design

## Context

See `proposal.md` and `specs/llm-usage-ledger/spec.md`. Console `[llm-usage]`
logs cannot support audit, reporting, or later budget enforcement. CAI-252
already persists pipeline runs.

## Goals / Non-Goals

**Goals:**

- Record model, operation, tokens, estimated cost, run, and stage from the
  central OpenAI provider.
- Use fixed-precision cost mapping with round-half-up to six decimal places.
- Block further paid requests for that provider instance when persistence fails.
- Surface the same ledger total on the slice run summary.

**Non-Goals:**

- Rejecting calls because monthly budget is exhausted.
- Email transport.
- Changing provider billing configuration.

## Decisions

### 1. Central provider callback, not per-script logs

Every successful `chat.completions.create` goes through one helper that maps
usage and invokes an optional `onUsage` sink. Scripts do not write ledger rows
themselves. The mapped record is an allowlist: operation, provider, model,
tokens, estimated cost, request id, run id, and stage.

### 2. Persistence failure is fail-closed

If a sink is configured and throws, the provider marks itself blocked and
throws a non-retryable `LLMUsagePersistError`. Later paid calls fail before
another OpenAI request. Unwired scripts keep console logging only.

### 3. Cost is integer micros, stored as `Decimal(12,6)`

`estimatedCostUsd = round_half_up((promptTokens * inputPrice + completionTokens
* outputPrice) / 1_000_000, 6)`. Arithmetic uses bigint micros to avoid float
drift. Slice summaries sum those rows for the run.

### 4. Additive migration after CAI-252

`llm_usage` references `pipeline_runs` with `ON DELETE CASCADE`. Historical
migrations are not rewritten. The CAI-252 verifier still applies the
coordination migration over a production-like database, then later additive
migrations.

## Control Flow

```text
successful OpenAI completion
        |
        v
map redacted usage + estimated cost
        |
        +-- no sink --> console log only
        v
persist LlmUsage
        |
        +-- persist fails --> block further paid calls
        v
slice finish sums ledger into summary.ledger
```

## Test Mapping

- **Unit:** pricing and token usage map to six-decimal cost and redacted fields.
- **Integration:** one mocked completion writes one row linked to run, stage,
  operation, and model.
- **E2E:** a capped fixture analysis slice summary matches the stored ledger
  total and stores no prompt content.

## Risks / Trade-offs

- [Call succeeds, persist fails] → The spent request is visible as a blocked
  provider rather than an unaccounted retry storm.
- [No sink configured] → Local scripts still log; production slice wiring is
  required before budget enforcement.
- [Missing usage on the response] → Record zero tokens rather than skip, so
  every successful call has a row.

## Rollback

Revert application code. Leave `llm_usage` in place until a reviewed cleanup
migration is authorized.
