# Spec Delta

## Purpose

Reserve conservative monthly LLM cost before paid requests so concurrent
slices cannot exceed the application ceiling.

## ADDED Requirements

### Requirement: Conservative reservation arithmetic

The system SHALL reserve, settle, and expire using fixed-precision arithmetic
and conservative available budget across precision and month-boundary cases.

#### Scenario: Unit — reservation arithmetic

- **GIVEN** reservations across precision and month-boundary cases
- **WHEN** reserve, settle, or expire executes
- **THEN** available budget is conservative and correct

### Requirement: Concurrent ceiling enforcement

The system SHALL reject concurrent reservations that would exceed the monthly
limit so settled plus reserved cost never exceeds the ceiling.

#### Scenario: Integration — concurrent reservations

- **GIVEN** concurrent PostgreSQL reservation attempts near the ceiling
- **WHEN** transactions commit
- **THEN** total settled plus reserved cost never exceeds the limit

### Requirement: Slice pauses paid work on exhaustion

The system SHALL pause paid stages when the budget is exhausted, continue
deterministic stages, and report `paused_budget`.

#### Scenario: E2E — budget exhaustion

- **GIVEN** a low test ceiling
- **WHEN** a slice exhausts it
- **THEN** paid stages pause, deterministic stages continue, and the run reports `paused_budget`
