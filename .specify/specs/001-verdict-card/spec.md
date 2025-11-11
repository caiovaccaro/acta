# Feature Specification: Verdict Card

**Feature Branch**: `001-verdict-card`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "Implement Verdict Card feature - display data-driven consensus verdicts on complex topics with evidence, dissent, and confidence scores"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Verdict Card for a Topic (Priority: P1)

A user visits the platform and wants to understand the consensus position on a complex topic. They navigate to a topic page and see a Verdict Card that displays a clear, data-backed stance with supporting evidence.

**Why this priority**: This is the core value proposition of Acta - replacing ambiguity with definitive, data-backed stances. Without this, users cannot achieve the primary goal of moving from indecision to informed action.

**Independent Test**: Can be fully tested by displaying a Verdict Card for any configured topic with all required fields populated, even if other features (Consensus Thermometer, Debate Card) are not yet implemented. Delivers immediate value by showing users a clear consensus position.

**Acceptance Scenarios**:

1. **Given** a topic exists with processed articles from at least 6 sources across at least 2 ideology buckets, **When** a user navigates to the topic page, **Then** they see a Verdict Card displaying the question, verdict label, confidence score, and all required fields.

2. **Given** a topic has insufficient data (fewer than 6 sources or only 1 ideology bucket), **When** a user navigates to the topic page, **Then** they see a Verdict Card with a "Split" verdict and "Low" confidence, with a note explaining insufficient data.

3. **Given** a Verdict Card is displayed, **When** a user views the "Why" section, **Then** they see exactly 3 evidence bullets, each with a citation to an ideologically diverse source.

4. **Given** a Verdict Card is displayed, **When** a user views the "Main Dissent" section, **Then** they see 1 counter-argument bullet with a citation from a credible source representing the opposing view.

5. **Given** a Verdict Card is displayed, **When** a user views the "Unknowns" section, **Then** they see 1 bullet describing missing facts or pending developments that affect the verdict.

6. **Given** a Verdict Card is displayed, **When** a user views the scope note, **Then** they see the number of sources analyzed and the date window (e.g., "Based on 24 sources from Jan 1-14, 2025").

---

### User Story 2 - Understand Verdict Calculation Transparency (Priority: P2)

A user wants to understand how the verdict was calculated and trust the methodology. They can view the scope note and understand the data foundation.

**Why this priority**: Transparency builds trust. Users need to understand the basis for the verdict to have confidence in taking action. This is essential for the platform's credibility.

**Independent Test**: Can be tested independently by verifying that scope notes accurately reflect the underlying data (source count, date range) and that users can understand the calculation basis without needing other features.

**Acceptance Scenarios**:

1. **Given** a Verdict Card is displayed, **When** a user reads the scope note, **Then** they see accurate information about the number of sources and date window used in the calculation.

2. **Given** a Verdict Card is displayed, **When** a user wants to understand the methodology, **Then** they can access an explanation of how verdicts are calculated (via link or expandable section).

3. **Given** a topic has articles from multiple ideology buckets, **When** a user views the scope note, **Then** they can see that sources are balanced across Left, Center, and Right perspectives.

---

### User Story 3 - View Safety and Contextual Information (Priority: P3)

A user viewing a sensitive topic (e.g., Gaza/Israel conflict) sees appropriate safety notes and contextual reminders about neutrality and anti-hate principles.

**Why this priority**: Ensures ethical presentation of sensitive topics and protects users from misinformation or hate speech. Important for platform credibility and user safety, but not required for basic functionality.

**Independent Test**: Can be tested independently by configuring topics with safety notes and verifying they display appropriately. Does not require other features to function.

**Acceptance Scenarios**:

1. **Given** a topic is configured with a safety note requirement, **When** a user views the Verdict Card, **Then** they see an appropriate safety reminder (e.g., anti-hate, neutrality statement) displayed prominently.

2. **Given** a topic does not require a safety note, **When** a user views the Verdict Card, **Then** no safety note is displayed.

3. **Given** a safety note is displayed, **When** a user reads it, **Then** the message clearly communicates the platform's commitment to neutrality and against hate speech.

---

### Edge Cases

- What happens when a topic has articles from only one ideology bucket? System displays verdict with appropriate confidence adjustment and notes the limitation in scope note.

- How does system handle topics with conflicting articles where variance is extremely high? System displays "Split" verdict with low confidence and explains the disagreement in the "Unknowns" section.

- What happens when a topic has fewer than 6 sources? System still displays Verdict Card but with "Split" verdict, "Low" confidence, and a note explaining insufficient data in scope note.

- How does system handle topics with no recent articles (outside 14-day window)? System displays verdict based on available data with appropriate date window note, or indicates data is stale.

- What happens when all articles from a topic are removed or marked invalid? System displays a message indicating no data available rather than an empty or broken Verdict Card.

- How does system handle topics where LLM stance classification fails for all articles? System falls back to displaying available metadata (RSS data) with appropriate confidence reduction, or indicates processing incomplete.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a Verdict Card for each configured topic showing the question, verdict label, and confidence score.

- **FR-002**: System MUST compute verdict labels using the following rules based on aggregate support share (S) and ideological dispersion:
  - "Yes" when S ≥ 0.67 and variance is low
  - "Leaning Yes" when S is 0.55-0.67 or variance is moderate
  - "Split" when S is 0.45-0.55 or variance is high
  - "Leaning No" when S is 0.33-0.45
  - "No" when S ≤ 0.33

- **FR-003**: System MUST compute confidence scores (0-100%) using the formula: distance from 0.5 × (1 - variance), and display as "Very High" (80-100%), "High" (60-79%), "Medium" (40-59%), or "Low" (0-39%).

- **FR-004**: System MUST display exactly 3 "Why" evidence bullets, each with a citation to an ideologically diverse source (ensuring representation from different ideology buckets).

- **FR-005**: System MUST display exactly 1 "Main Dissent" bullet with a citation from a credible source representing the opposing view.

- **FR-006**: System MUST display exactly 1 "Unknowns" bullet describing missing facts or pending developments that affect the verdict.

- **FR-007**: System MUST display a scope note showing the number of sources analyzed and the date window (e.g., "Based on 24 sources from Jan 1-14, 2025").

- **FR-008**: System MUST display a safety note for topics configured as requiring one (e.g., anti-hate reminders for sensitive topics).

- **FR-009**: System MUST weight outlets by credibility scores (0-1 scale) and normalize weights so Left, Center, and Right ideology buckets each sum to equal total weight.

- **FR-010**: System MUST compute aggregate support share (S) from weighted outlet stances, where each article's stance contributes to its outlet's stance, and outlets are weighted by credibility.

- **FR-011**: System MUST compute ideological dispersion (variance) across Left, Center, and Right buckets to determine verdict label and confidence.

- **FR-012**: System MUST only display Verdict Cards for topics that have at least 6 sources from at least 2 ideology buckets, or display "Split" verdict with "Low" confidence if this threshold is not met.

- **FR-013**: System MUST update Verdict Cards when new articles are processed, recalculating verdict, confidence, and evidence bullets based on the 14-day rolling window.

- **FR-014**: System MUST ensure citations in "Why" and "Main Dissent" sections link to the original article sources.

- **FR-015**: System MUST handle topics with insufficient or stale data gracefully, displaying appropriate messages rather than broken or empty cards.

### Key Entities *(include if feature involves data)*

- **Topic**: Represents a complex question or issue being analyzed (e.g., "Is what's happening in Gaza a genocide?"). Has a unique identifier, question text, configuration for safety notes, and associated articles.

- **Verdict**: The computed consensus position for a topic. Contains verdict label (Yes/Leaning Yes/Split/Leaning No/No), confidence score (0-100%), support share (S), variance, calculation timestamp, and date window.

- **Article**: News article from a verified outlet. Contains title, content, publication date, source outlet, extracted stance label, and analysis metadata. Articles are processed and their stances contribute to outlet-level stances.

- **Outlet**: News source with metadata. Contains name, ideology classification (Left/Center/Right), credibility score (0-1), RSS feed URLs, and list of associated articles. Outlets are weighted in consensus calculation.

- **Evidence Bullet**: A supporting argument for the verdict. Contains text (short evidence line), citation (link to source article), and source outlet information. Used in "Why" section (3 bullets) and "Main Dissent" section (1 bullet).

- **Unknown**: Missing fact or pending development that affects the verdict. Contains description text and relevance context. Displayed as 1 bullet in "Unknowns" section.

- **Scope Note**: Metadata about the verdict calculation. Contains source count, date window (start and end dates), and calculation timestamp. Provides transparency about data foundation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view a complete Verdict Card (all required fields populated) for any configured topic within 2 seconds of navigating to the topic page.

- **SC-002**: Verdict Cards display accurate verdict labels and confidence scores that match the underlying consensus calculation (100% accuracy when verified against calculation inputs).

- **SC-003**: At least 90% of Verdict Cards for topics with sufficient data (≥6 sources, ≥2 ideology buckets) display non-"Split" verdicts (Yes, Leaning Yes, Leaning No, or No), demonstrating the system can produce clear stances.

- **SC-004**: All "Why" evidence bullets include citations from ideologically diverse sources, with at least 2 different ideology buckets represented across the 3 bullets.

- **SC-005**: Verdict Cards update automatically when new articles are processed, with recalculation completing within 5 minutes of article ingestion completion.

- **SC-006**: Users can understand the verdict calculation basis from the scope note, with 85% of users correctly identifying the number of sources and date range when tested.

- **SC-007**: Topics with insufficient data (fewer than 6 sources or only 1 ideology bucket) display appropriate "Split" verdicts with "Low" confidence and explanatory notes, preventing misleading high-confidence verdicts from sparse data.

- **SC-008**: Safety notes display for 100% of topics configured as requiring them, ensuring appropriate context for sensitive topics.
