# Spec Delta

## Purpose

Provide durable, auditable coordination state so disposable pipeline workers
can recover safely without concurrent mutation or invalid run-state changes.

## ADDED Requirements

### Requirement: Explicit pipeline run state machine

The system SHALL persist pipeline run and stage state and SHALL reject every run
transition that is not an explicitly declared state-machine edge.

#### Scenario: Unit — declared run transitions

- **GIVEN** every allowed and forbidden run transition
- **WHEN** the transition guard evaluates it
- **THEN** only the declared state-machine edges succeed

### Requirement: Durable singular lease

The system SHALL permit exactly one owner of the pipeline resource, SHALL
support owner-only heartbeat and release, and SHALL atomically recover a stale
lease while preserving the displaced ownership audit.

#### Scenario: Integration — concurrent lease lifecycle

- **GIVEN** concurrent database clients
- **WHEN** they acquire, heartbeat, release, and reclaim a stale lease
- **THEN** ownership remains singular and auditable

### Requirement: Competing process exclusion

The system SHALL expose protected-operation acquisition to independent worker
processes and SHALL allow only the lease winner to perform mutation.

#### Scenario: E2E — competing runners

- **GIVEN** two runner processes started together
- **WHEN** both attempt the protected operation
- **THEN** exactly one performs work and the other exits without mutation
