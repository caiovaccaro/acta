# Spec Delta

## Purpose

Record every successful central-provider LLM call in a redacted usage ledger
and expose the same cost on the slice run summary.

## ADDED Requirements

### Requirement: Fixed-precision usage mapping

The system SHALL calculate estimated USD cost from model pricing and token
usage using fixed-precision arithmetic and SHALL map only redacted metadata.

#### Scenario: Unit — cost mapping

- **GIVEN** model pricing and token usage
- **WHEN** cost is calculated and mapped
- **THEN** fixed-precision cost and redacted metadata are correct

### Requirement: Provider completion writes one ledger row

The system SHALL persist exactly one `LlmUsage` row for each successful
mocked provider response, linked to its run, stage, operation, and model.

#### Scenario: Integration — one usage row

- **GIVEN** one successful mocked provider response
- **WHEN** the provider completes
- **THEN** exactly one usage row links to its run, stage, operation, and model

### Requirement: Slice summary matches ledger cost

The system SHALL include the ledger cost on the slice email/run summary and
SHALL NOT store prompt content in the ledger or summary.

#### Scenario: E2E — run summary ledger cost

- **GIVEN** a capped fixture analysis
- **WHEN** the slice finishes
- **THEN** its email/run summary includes the same ledger cost without storing prompt content
