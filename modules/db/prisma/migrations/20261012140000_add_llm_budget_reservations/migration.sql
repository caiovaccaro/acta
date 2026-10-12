-- Additive monthly LLM budget reservations. Existing application tables
-- and rows are not altered.

CREATE TYPE "LlmBudgetReservationStatus" AS ENUM ('reserved', 'settled', 'expired');

CREATE TABLE "llm_budget_reservations" (
  "id" TEXT NOT NULL,
  "month" VARCHAR(7) NOT NULL,
  "pipelineRunId" TEXT,
  "operation" VARCHAR(100) NOT NULL,
  "reservedCostUsd" DECIMAL(12,6) NOT NULL,
  "actualCostUsd" DECIMAL(12,6),
  "status" "LlmBudgetReservationStatus" NOT NULL DEFAULT 'reserved',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "llm_budget_reservations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "llm_budget_reservations_month_status_idx"
  ON "llm_budget_reservations"("month", "status");
CREATE INDEX "llm_budget_reservations_pipelineRunId_status_idx"
  ON "llm_budget_reservations"("pipelineRunId", "status");
CREATE INDEX "llm_budget_reservations_expiresAt_status_idx"
  ON "llm_budget_reservations"("expiresAt", "status");

ALTER TABLE "llm_budget_reservations"
  ADD CONSTRAINT "llm_budget_reservations_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
