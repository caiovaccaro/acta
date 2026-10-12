# Spec Delta

## Purpose

Give disposable workers one resumable, deadline-aware pipeline entry point
with leases, checkpoints, summaries, and explicit status codes.

## ADDED Requirements

### Requirement: Slice orchestration decisions

The system SHALL evaluate stage outcomes, deadlines, and heartbeat states and
SHALL select the specified status and stage order. Invalid configuration SHALL
fail terminally before paid work.

#### Scenario: Unit — orchestration decisions

- **GIVEN** stage outcomes, deadlines, and heartbeat states
- **WHEN** orchestration evaluates the next action
- **THEN** it selects the specified status and stage order

### Requirement: Persisted recoverable progress

The system SHALL persist pause and recoverable failure at the last committed
unit when a slice stops before completion.

#### Scenario: Integration — persisted pause or recoverable failure

- **GIVEN** real run repositories and fixture stage adapters
- **WHEN** a slice pauses or fails recoverably
- **THEN** progress and error state persist at the last committed unit

### Requirement: Killed-run resume

The system SHALL resume a terminated slice from the last checkpoint and SHALL
complete later slices with one coherent summary. Remaining backlog SHALL be a
successful resumable outcome.

#### Scenario: E2E — killed-run recovery

- **GIVEN** a multi-stage backlog
- **WHEN** one process is terminated and later slices resume
- **THEN** the run eventually completes with a coherent summary
