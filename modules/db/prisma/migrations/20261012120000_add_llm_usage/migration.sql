-- Additive LLM usage audit ledger. Existing application tables and rows
-- are not altered. This table never stores prompts, completions, API keys,
-- or article text.

CREATE TABLE "llm_usage" (
  "id" TEXT NOT NULL,
  "pipelineRunId" TEXT,
  "stage" VARCHAR(100),
  "operation" VARCHAR(100) NOT NULL,
  "provider" VARCHAR(40) NOT NULL,
  "model" VARCHAR(100) NOT NULL,
  "promptTokens" INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "estimatedCostUsd" DECIMAL(12,6) NOT NULL,
  "providerRequestId" VARCHAR(128),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "llm_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "llm_usage_pipelineRunId_createdAt_idx"
  ON "llm_usage"("pipelineRunId", "createdAt");
CREATE INDEX "llm_usage_createdAt_idx" ON "llm_usage"("createdAt");
CREATE INDEX "llm_usage_operation_createdAt_idx"
  ON "llm_usage"("operation", "createdAt");

ALTER TABLE "llm_usage"
  ADD CONSTRAINT "llm_usage_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
