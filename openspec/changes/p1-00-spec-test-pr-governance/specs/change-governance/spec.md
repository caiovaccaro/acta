# Spec Delta

## Purpose

Defines the enforceable evidence and review controls that every Acta change must
satisfy before pull-request creation and merge.

## ADDED Requirements

### Requirement: Pre-PR readiness fails closed
The governance system SHALL reject readiness when required specification sections, test classes, commands, or commit-bound evidence are missing or failing.

#### Scenario: Incomplete specification is rejected by unit validation
- **GIVEN** a ticket or OpenSpec artifact omits a required section
- **WHEN** validation runs
- **THEN** readiness fails with the missing section named

### Requirement: Linear and OpenSpec remain synchronized
The governance system SHALL compare the Linear issue's change identifier and Given/When/Then scenarios with its repository OpenSpec delta without exposing credentials.

#### Scenario: Linear mirror consistency is checked at the provider boundary
- **GIVEN** synchronized and divergent fixture Linear issues and OpenSpec changes
- **WHEN** consistency validation runs through the mocked Linear boundary
- **THEN** only the synchronized change passes

### Requirement: Merge requires complete and current evidence
The governance system SHALL block merge until specification checks, all test classes, commit-bound evidence, and the latest adversarial review pass.

#### Scenario: Protected test pull request enforces all gates
- **GIVEN** a disposable repository with branch protection
- **WHEN** an incomplete and then compliant test PR are evaluated
- **THEN** only the compliant PR becomes mergeable after adversarial review passes
