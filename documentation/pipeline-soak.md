# Pipeline soak runbook

## Goal

Seven consecutive scheduled days without unrecovered failure, data freshness
within 48 hours, receipts delivered, and projected monthly cost below USD 50.

## Steady-state configuration

| Setting | Value |
| --- | --- |
| `max-runtime-minutes` | 285 |
| `max-new-articles` | 20 |
| `max-analysis-articles` | 20 |
| `ACTA_LLM_MONTHLY_CEILING_USD` | 30.000000 |
| `AUTO_APPROVE_TOPICS` | unset / false |

Do not raise caps in a way that weakens the USD 30 application ceiling or the
USD 50 operating ceiling.

## Restart rule

Any `failed_terminal` or unrecovered `failed_recoverable` run restarts the
seven-day clock after the cause is corrected. Do not hide manual database
repairs; record them in the soak incident log.

## Close-out

Fixture evidence lives in `openspec/changes/p1-18-production-soak-tuning`.
Production soak evidence is collected only after this stack is on the default
branch and the six-hour workflow is enabled.
