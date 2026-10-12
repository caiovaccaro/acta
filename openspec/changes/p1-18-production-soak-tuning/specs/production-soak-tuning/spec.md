# Spec Delta

## Purpose

Validate seven consecutive scheduled days for freshness, recovery, email, and
cost before declaring Phase 1 steady.

## ADDED Requirements

### Requirement: Soak metrics validate pass/fail gates

The system SHALL compute freshness, reliability, and monthly projection
pass/fail values from soak metrics and usage totals.

#### Scenario: Unit — report validation and monthly projection

- **GIVEN** soak metrics and usage totals
- **WHEN** report validation and monthly projection run
- **THEN** freshness, reliability, and cost pass/fail values are correct

### Requirement: Reported values are traceable

The system SHALL generate soak metrics only from stored pipeline runs and the
usage ledger.

#### Scenario: Integration — production run records and usage ledger

- **GIVEN** production run records and the usage ledger
- **WHEN** soak metrics are generated
- **THEN** every reported value is traceable to stored evidence

### Requirement: Seven consecutive days close the soak

The system SHALL require freshness, recovery, email, and cost targets to pass
before Phase 1 is declared steady.

#### Scenario: E2E — seven consecutive scheduled slices

- **GIVEN** seven consecutive days of scheduled slices
- **WHEN** the soak closes
- **THEN** freshness, recovery, email, and cost targets all pass before Phase 1 is declared steady
