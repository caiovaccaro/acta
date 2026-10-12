# Spec Delta

## Purpose

Send owner-visible pipeline receipts and moderation digests without storing
secrets or corrupting pipeline state.

## ADDED Requirements

### Requirement: Templates are aggregated, linked, and redacted

The system SHALL render success, pause, budget, moderation, and failure
notifications whose subjects, production/admin links, aggregates, and
redaction match the Phase 1 notification contract.

#### Scenario: Unit — rendered receipts

- **GIVEN** success, pause, budget, moderation, and failure summaries containing sensitive values
- **WHEN** templates render
- **THEN** subjects, links, aggregates, and redaction match the specification

### Requirement: Delivery failures are recorded without corrupting pipeline state

The system SHALL record Resend acceptance, rejection, and timeout attempts and
SHALL leave successful pipeline status unchanged when delivery fails.

#### Scenario: Integration — mocked Resend outcomes

- **GIVEN** mocked Resend acceptance, rejection, and timeout responses
- **WHEN** notification delivery runs
- **THEN** attempts and failures are recorded without corrupting pipeline state

### Requirement: Each finished slice produces one complete receipt

The system SHALL deliver one complete receipt for a successful fixture slice
and one complete receipt for a forced terminal failure.

#### Scenario: E2E — success and failure receipts

- **GIVEN** a successful fixture slice and a forced terminal failure
- **WHEN** both finish
- **THEN** the test transport receives one complete receipt for each outcome
