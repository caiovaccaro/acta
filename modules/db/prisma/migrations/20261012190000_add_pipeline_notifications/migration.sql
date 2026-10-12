-- Additive pipeline notification attempts. Bodies, destinations, and secrets
-- are never stored.

CREATE TYPE "PipelineNotificationKind" AS ENUM (
  'success',
  'pause',
  'failure',
  'budget',
  'moderation_digest'
);

CREATE TYPE "PipelineNotificationStatus" AS ENUM (
  'accepted',
  'rejected',
  'timeout',
  'network',
  'missing_config',
  'disabled'
);

CREATE TABLE "pipeline_notifications" (
  "id" TEXT NOT NULL,
  "pipelineRunId" TEXT,
  "kind" "PipelineNotificationKind" NOT NULL,
  "status" "PipelineNotificationStatus" NOT NULL,
  "subject" VARCHAR(200) NOT NULL,
  "providerMessageId" VARCHAR(80),
  "errorCode" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pipeline_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pipeline_notifications_pipelineRunId_createdAt_idx"
  ON "pipeline_notifications"("pipelineRunId", "createdAt");
CREATE INDEX "pipeline_notifications_kind_createdAt_idx"
  ON "pipeline_notifications"("kind", "createdAt");

ALTER TABLE "pipeline_notifications"
  ADD CONSTRAINT "pipeline_notifications_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
