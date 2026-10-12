# Spec Delta

## Purpose

Approve fully eligible Level 1 topics only when `AUTO_APPROVE_TOPICS=true`.

## ADDED Requirements

### Requirement: Mutation is flag-gated

The system SHALL mutate only when the flag is enabled and every policy
condition passed. Disabling the flag stops future mutations.

#### Scenario: Unit — enabled, disabled, eligible, ineligible

- **GIVEN** enabled and disabled flags plus eligible and ineligible decisions
- **WHEN** mutation is considered
- **THEN** only enabled, fully eligible topics may proceed and rollback disables future changes

### Requirement: Status and audit commit together

The system SHALL update topic status and the audit row in one transaction
and leave failed topics pending.

#### Scenario: Integration — eligible and ineligible topics

- **GIVEN** eligible and ineligible topics
- **WHEN** policy mutation commits
- **THEN** status and audit records update atomically only for eligible topics

### Requirement: Eligible topics become public and emailed

The system SHALL publish only the eligible topic through normal public
filtering and name it in the mutation email.

#### Scenario: E2E — production-like candidate set

- **GIVEN** a production-like candidate set
- **WHEN** an auto-approval slice runs
- **THEN** only the eligible topic becomes visible through normal public filtering and appears in the receipt
