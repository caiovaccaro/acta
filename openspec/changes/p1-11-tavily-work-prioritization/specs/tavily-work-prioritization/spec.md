# Spec Delta

## Purpose

Match Tavily signals to existing work, rank it, and claim capped extraction and
analysis units with a 70/30 split and a budget-derived effective cap.

## ADDED Requirements

### Requirement: Deterministic matching, scoring, and allocation

The system SHALL match signals by exact URL, title/domain, and topic alias,
leave ambiguous, duplicate, and unmatched signals unlinked, and produce
deterministic scores, effective caps, and 70/30 queues.

#### Scenario: Unit — matching and allocation

- **GIVEN** exact URL, title/domain, topic alias, ambiguous, duplicate, and unmatched signals plus remaining budget
- **WHEN** scoring and allocation run
- **THEN** matches, effective cap, and 70/30 queues are deterministic

### Requirement: Capped stage selection preserves pool proportions

The system SHALL claim priority and age pools in the specified proportions
without duplicate claims.

#### Scenario: Integration — stage selection

- **GIVEN** persisted signals and eligible topic/article work
- **WHEN** capped stage selection runs
- **THEN** priority and age pools claim the specified proportions without duplicate claims

### Requirement: Trending work runs first without starving oldest work

The system SHALL process trending work first on repeated bounded slices while
still claiming oldest eligible work under a low budget-derived cap.

#### Scenario: E2E — priority and age

- **GIVEN** trending and older non-trending fixture topics and articles under a low budget cap
- **WHEN** repeated bounded slices run
- **THEN** trending work runs first and older work is not starved
