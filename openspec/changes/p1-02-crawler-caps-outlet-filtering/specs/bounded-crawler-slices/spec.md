# Spec Delta

## Purpose

Defines deterministic, capped, retry-safe crawler slices for selected free
outlets and a browserless production execution boundary.

## ADDED Requirements

### Requirement: Crawler arguments resolve an exact bounded slice
The crawler SHALL return exact selected outlets and a non-negative article cap from explicit CLI arguments. Production execution MUST require a finite cap, including zero as a no-write boundary. Unknown or ambiguous outlets MUST fail before RSS, crawl-request, or article writes.

#### Scenario: Unit
- **GIVEN** outlet filters and an article cap
- **WHEN** crawler arguments are parsed
- **THEN** selected outlets and the exact cap are returned, including zero-work boundaries

### Requirement: Claiming is selected, atomic, and capped
The crawler SHALL atomically claim pending requests only for selected outlet identifiers and SHALL claim no more than the remaining slice allowance. Concurrent claimers MUST NOT receive the same request. Unclaimed requests SHALL remain pending.

#### Scenario: Integration
- **GIVEN** pending requests for multiple outlets
- **WHEN** the capped claimant runs
- **THEN** it claims only selected outlets and never more than the cap

### Requirement: Completion is capped, observable, and retry-safe
The crawler SHALL persist no more successful extractions than the configured maximum and SHALL return structured discovered, claimed, completed, failed, and remaining counts. Failed or interrupted claims MUST remain recoverable for retry. The production path MUST use static HTTP extraction without a browser binary or paid provider.

#### Scenario: E2E
- **GIVEN** fixture RSS feeds with more eligible articles than the limit
- **WHEN** the crawler completes
- **THEN** persisted extractions do not exceed the configured maximum and remaining work stays retryable
