# Spec Delta

## Purpose

Collect bounded Tavily basic-search trend signals and degrade safely when the
provider fails or the request cap is exhausted.

## ADDED Requirements

### Requirement: Deterministic normalization and caps

The system SHALL normalize Tavily results into valid URLs, domains, scores, and
capped request counts, dropping duplicates and malformed items.

#### Scenario: Unit — normalization

- **GIVEN** duplicate, malformed, and boundary Tavily results
- **WHEN** normalization runs
- **THEN** valid URLs, domains, scores, and request counts are deterministic and capped

### Requirement: Persist only valid results

The system SHALL persist signals only for valid mocked success payloads and
SHALL return the specified degraded result for timeout, malformed, empty, and
quota failures.

#### Scenario: Integration — client persistence

- **GIVEN** mocked Tavily success, timeout, malformed, empty, and quota responses
- **WHEN** the client runs
- **THEN** signals persist only when valid and failures return the specified degraded result

### Requirement: Trends stage degrades without blocking RSS

The system SHALL keep stored signals usable after later quota exhaustion and
SHALL continue the pipeline in degraded mode.

#### Scenario: E2E — trend stage quota

- **GIVEN** a fixture daily trend stage
- **WHEN** Tavily succeeds and later exhausts quota
- **THEN** stored signals remain usable and the pipeline continues in degraded mode
