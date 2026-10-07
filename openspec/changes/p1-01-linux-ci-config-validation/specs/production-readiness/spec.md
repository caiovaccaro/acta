# Spec Delta

## Purpose

Defines the non-secret production configuration contract and deterministic
Linux verification that establish whether Acta is ready to build and merge.

## ADDED Requirements

### Requirement: Production configuration validation is safe and actionable
The system SHALL validate required production variable presence, format, strength, range, and cross-field constraints before production work starts. A failure SHALL identify only variable names and violated constraints, never submitted values.

#### Scenario: Invalid production configuration is rejected safely
- **GIVEN** missing or invalid production variables
- **WHEN** configuration validation runs
- **THEN** it reports variable names and constraints without values

### Requirement: Clean installation and workspace verification are deterministic
The system SHALL install from the committed lockfile, generate the Prisma client, prepare a disposable PostgreSQL schema, and run every workspace test package without production credentials or paid provider calls.

#### Scenario: Clean workspace verification succeeds against disposable PostgreSQL
- **GIVEN** a clean workspace and CI PostgreSQL
- **WHEN** installation, Prisma generation, and workspace tests run
- **THEN** every package completes successfully

### Requirement: Canonical Linux verification is commit-bound
The system SHALL expose explicit unit, integration, end-to-end, and regression commands through the readiness manifest. The Linux end-to-end path SHALL validate fixture configuration, build the web application, and emit evidence bound to the reviewed commit.

#### Scenario: Clean Linux verification builds and reports success
- **GIVEN** a clean Linux runner
- **WHEN** the canonical verification command runs
- **THEN** it builds the web app and emits a successful commit-bound report
