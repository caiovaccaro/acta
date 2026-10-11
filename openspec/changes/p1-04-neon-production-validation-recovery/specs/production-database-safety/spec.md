# Spec Delta

## Purpose

Defines safe validation, controlled migration, tested recovery, and deployed runtime evidence for Acta's canonical existing Neon production database.

## ADDED Requirements

### Requirement: Production database validation is read-only and secret-safe
The system SHALL treat existing Neon as canonical, enforce distinct pooled runtime and direct migration variables, inspect required tables and migration state read-only, and validate bounded counts and representative public IDs. Failures SHALL name violated contracts without values, credentials, or private row contents.

#### Scenario: Unit
- **GIVEN** expected schema, migration, integrity, and connection-variable rules
- **WHEN** validation runs against missing or malformed metadata
- **THEN** it fails with actionable diagnostics that name the violated contract without exposing values

### Requirement: Logical recovery is verified in disposable PostgreSQL
The system SHALL create a fresh logical backup without committing it, restore into empty disposable PostgreSQL on host port 55434, and apply the same schema and representative-data checks. The process SHALL fail on destructive drift and SHALL NOT mutate or migrate production.

#### Scenario: Integration
- **GIVEN** a fresh logical backup of the existing Neon database and empty disposable PostgreSQL
- **WHEN** restore and migration verification run
- **THEN** the restored database reaches the current schema and passes required table, bounded row-count, and representative-ID checks without destructive drift

### Requirement: Production runtime evidence uses the canonical database
The system SHALL verify that Vercel health reports a connected database and that public topic and question APIs return non-empty data. Controlled migration SHALL fail closed, require the direct connection explicitly, and never run implicitly in tests, previews, or builds. Verification SHALL use existing free-tier resources only.

#### Scenario: E2E
- **GIVEN** the Vercel preview connected to the existing Neon database
- **WHEN** health and representative public topic/question API checks run
- **THEN** the database reports connected and both APIs return non-empty production data
