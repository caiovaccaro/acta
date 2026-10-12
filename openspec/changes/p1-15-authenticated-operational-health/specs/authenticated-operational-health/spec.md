# Spec Delta

## Purpose

Expose pipeline freshness, queues, moderation, and budget only to an
authenticated owner.

## ADDED Requirements

### Requirement: Health mapping respects authorization and failures

The system SHALL hide operational data from unauthorized callers, mark stale
thresholds, and label internal errors unknown.

#### Scenario: Unit — mapping

- **GIVEN** authorization states, stale thresholds, and internal errors
- **WHEN** health mapping runs
- **THEN** access, status, and redaction are correct

### Requirement: Only authenticated responses include operational data

The system SHALL return operational records only when an admin session is
present.

#### Scenario: Integration — authenticated and unauthenticated requests

- **GIVEN** real pipeline and queue records
- **WHEN** authenticated and unauthenticated requests hit the endpoint
- **THEN** only the authenticated response contains operational data

### Requirement: Owner UI reports stale operational state

The system SHALL show stale state, queues, moderation, and budget in the
admin dashboard.

#### Scenario: E2E — admin login and stale fixture

- **GIVEN** an admin login and stale fixture run
- **WHEN** the owner opens operational health
- **THEN** the UI visibly reports stale state, queues, moderation, and budget
