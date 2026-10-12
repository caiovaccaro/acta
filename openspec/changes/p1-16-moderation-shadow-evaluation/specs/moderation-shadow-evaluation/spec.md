# Spec Delta

## Purpose

Classify seven successful daily shadow runs and emit a Level 1 go/no-go
recommendation without enabling mutation.

## ADDED Requirements

### Requirement: Evaluation metrics follow the rubric

The system SHALL classify labeled shadow decisions and apply a zero
false-approval tolerance.

#### Scenario: Unit — metrics and report validation

- **GIVEN** labeled shadow decisions
- **WHEN** evaluation metrics and report validation run
- **THEN** false approvals, holds, and threshold summaries are correct

### Requirement: Included decisions are traceable

The system SHALL include only stored decisions that keep evidence ids and
policy version.

#### Scenario: Integration — stored decisions and owner labels

- **GIVEN** stored decisions and owner labels
- **WHEN** the evaluation report is built
- **THEN** every included decision is traceable to evidence and policy version

### Requirement: Seven successful fixture days produce go/no-go

The system SHALL emit a valid recommendation with proposed thresholds after
seven successful fixture daily runs.

#### Scenario: E2E — seven fixture daily runs

- **GIVEN** seven successful fixture daily runs
- **WHEN** evaluation completes
- **THEN** it emits a valid go/no-go recommendation with proposed thresholds
