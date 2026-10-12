-- Additive shadow-mode moderation policy decisions. Existing topic
-- moderationStatus values are not altered.

CREATE TABLE "moderation_policy_decisions" (
  "id" TEXT NOT NULL,
  "pipelineRunId" TEXT,
  "subjectType" VARCHAR(40) NOT NULL,
  "subjectId" TEXT NOT NULL,
  "policyVersion" VARCHAR(80) NOT NULL,
  "mode" VARCHAR(20) NOT NULL,
  "decision" VARCHAR(40) NOT NULL,
  "conditions" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_policy_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "moderation_policy_decisions_subjectType_subjectId_createdAt_idx"
  ON "moderation_policy_decisions"("subjectType", "subjectId", "createdAt");
CREATE INDEX "moderation_policy_decisions_pipelineRunId_createdAt_idx"
  ON "moderation_policy_decisions"("pipelineRunId", "createdAt");

ALTER TABLE "moderation_policy_decisions"
  ADD CONSTRAINT "moderation_policy_decisions_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
