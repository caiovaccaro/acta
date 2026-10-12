# Spec Delta

## Purpose

Evaluate Level 1 topic auto-approval in shadow mode, persist every condition
result, and never mutate moderation status.

## ADDED Requirements

### Requirement: Explain every Level 1 condition

The system SHALL evaluate each moderation condition at, above, and below its
threshold and SHALL include the decision and policy version with every pass and
failure.

#### Scenario: Unit — condition thresholds

- **GIVEN** each moderation condition at, above, and below its threshold
- **WHEN** policy evaluation runs
- **THEN** the decision and policy version explain every pass and failure

### Requirement: Shadow evaluation is auditable and non-mutating

The system SHALL store an auditable proposal from real topic, article, outlet,
and trend-signal records without mutating moderation status.

#### Scenario: Integration — stored proposal

- **GIVEN** real topic, article, outlet, and trend-signal records
- **WHEN** shadow evaluation runs
- **THEN** it stores an auditable proposal without mutating moderation status

### Requirement: Only eligible candidates are proposed

The system SHALL propose only the approval-ready candidate from a mixed fixture
and SHALL leave every moderation status unchanged.

#### Scenario: E2E — shadow slice

- **GIVEN** approval-ready, incomplete, duplicate, and safety-sensitive candidates
- **WHEN** a shadow slice completes
- **THEN** it proposes only the eligible approval and leaves every status unchanged
