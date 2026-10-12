# Design

## Context

See `proposal.md` and `specs/moderation-policy-shadow/spec.md`. Section 9.5
defines Level 1 topic auto-approval. Production mutation is out of scope.

## Goals / Non-Goals

**Goals:**

- Evaluate every Level 1 condition and store pass/fail plus evidence IDs.
- Shadow-mode proposals only.
- Hold safety-sensitive and incomplete candidates pending.

**Non-Goals:**

- Enabling `AUTO_APPROVE_TOPICS` mutation.
- Question Level 2 auto-validation.
- Email delivery.

## Decisions

### 1. Policy version `acta-moderation-policy/v1`

Changing thresholds does not rewrite past rows. Each decision stores the
version, mode `shadow`, and the eight condition results.

### 2. Deterministic safety list

Tokens cover weapons, child sexual exploitation, suicide/self-harm, and violent
extremism. A match in name or description fails `not_safety_sensitive`.

### 3. Missing evidence is pending

Null confidence or zero corroborating Tavily hits are `missing_evidence`, not
approvals. Contradictory near-duplicates also stay pending.

### 4. Finalize is the write boundary

The default finalize adapter evaluates pending topics, writes
`moderation_policy_decisions`, and returns `mutated: false` next to the receipt
metrics. It never updates `Topic.moderationStatus`.

## Test Mapping

- **Unit:** each condition at, above, and below its threshold.
- **Integration:** real topic/article/outlet/signal rows store a proposal
  without status mutation.
- **E2E:** approval-ready, incomplete, duplicate, and safety-sensitive
  candidates; only the eligible topic is proposed.

## Rollback

Revert application code. Leave `moderation_policy_decisions` in place.
