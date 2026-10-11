# Spec Delta

## Purpose

Give long pipeline stages a stable, bounded, deadline-aware unit of work so
restarts resume after the last committed record without skipping or duplicating
items on mutating tables.

## ADDED Requirements

### Requirement: Stable keyset cursors

The system SHALL page work with a `(createdAt, id)` cursor, SHALL keep ordering
stable when timestamps are equal, and SHALL NOT skip a later eligible record
because an earlier record was deleted.

#### Scenario: Unit — stable cursor advance

- **GIVEN** equal timestamps, deleted records, empty windows, and deadline boundaries
- **WHEN** cursors advance
- **THEN** ordering is stable and no uncommitted item is skipped

### Requirement: Bounded committed units

The system SHALL process a configured unit cap, SHALL persist a checkpoint only
after a unit commits, and SHALL leave the cursor unchanged when a unit fails.
Production SHALL require an explicit unit cap.

#### Scenario: Integration — mutating dataset

- **GIVEN** a PostgreSQL dataset mutated between pages
- **WHEN** bounded traversal completes
- **THEN** each eligible record is committed exactly once

### Requirement: Interrupted resume

The system SHALL allow a later process to resume after the last committed
checkpoint and SHALL NOT rewrite domain rows that already succeeded.

#### Scenario: E2E — interrupted stage

- **GIVEN** a multi-page stage interrupted after a checkpoint
- **WHEN** a new process resumes
- **THEN** it reaches completion without duplicate domain writes
