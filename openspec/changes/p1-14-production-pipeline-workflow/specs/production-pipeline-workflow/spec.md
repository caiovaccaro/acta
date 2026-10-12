# Spec Delta

## Purpose

Schedule and manually dispatch bounded production pipeline slices on standard
GitHub-hosted runners.

## ADDED Requirements

### Requirement: Workflow policy is read-only and bounded

The system SHALL accept only read-only permissions, a 330-minute timeout, and
safe dispatch inputs.

#### Scenario: Unit — workflow schema

- **GIVEN** workflow YAML and dispatch inputs
- **WHEN** schema and policy validation run
- **THEN** only read-only permissions, bounded timeouts, and safe inputs pass

### Requirement: Fixture workflow commands complete a slice

The system SHALL execute setup, migration, and one slice against PostgreSQL
without printing secrets.

#### Scenario: Integration — fixture Actions commands

- **GIVEN** a fixture Actions environment with PostgreSQL and mocked providers
- **WHEN** workflow commands execute
- **THEN** setup, migration, and one slice complete without secret output

### Requirement: Manual dispatch persists progress and a receipt

The system SHALL persist a capped slice and send its receipt when dispatched
against a disposable hosted database.

#### Scenario: E2E — disposable-cloud dispatch

- **GIVEN** a manual dispatch against a disposable hosted database
- **WHEN** the workflow runs
- **THEN** a capped slice persists progress and sends its receipt
