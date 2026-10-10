-- Additive coordination schema for disposable pipeline workers.
-- Existing application tables and rows are not altered.

CREATE TYPE "PipelineTrigger" AS ENUM ('scheduled', 'manual', 'retry');
CREATE TYPE "PipelineRunStatus" AS ENUM (
  'queued',
  'running',
  'completed',
  'paused_budget',
  'paused_deadline',
  'blocked_moderation',
  'failed_recoverable',
  'failed_terminal'
);
CREATE TYPE "PipelineStageStatus" AS ENUM (
  'pending',
  'running',
  'completed',
  'paused_deadline',
  'paused_budget',
  'failed_recoverable',
  'failed_terminal'
);
CREATE TYPE "PipelineLeaseEventType" AS ENUM (
  'acquired',
  'released',
  'stale_takeover'
);

CREATE TABLE "pipeline_runs" (
  "id" TEXT NOT NULL,
  "trigger" "PipelineTrigger" NOT NULL,
  "status" "PipelineRunStatus" NOT NULL DEFAULT 'queued',
  "startedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "deadlineAt" TIMESTAMP(3),
  "nextEligibleAt" TIMESTAMP(3),
  "summary" JSONB,
  "errorCode" VARCHAR(64),
  "errorMessage" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_stage_runs" (
  "id" TEXT NOT NULL,
  "pipelineRunId" TEXT NOT NULL,
  "stage" VARCHAR(100) NOT NULL,
  "status" "PipelineStageStatus" NOT NULL DEFAULT 'pending',
  "cursor" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "metrics" JSONB,
  "errorCode" VARCHAR(64),
  "errorMessage" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pipeline_stage_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pipeline_leases" (
  "resource" VARCHAR(100) NOT NULL,
  "ownerToken" VARCHAR(100),
  "pipelineRunId" TEXT,
  "generation" INTEGER NOT NULL DEFAULT 0,
  "acquiredAt" TIMESTAMP(3),
  "heartbeatAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pipeline_leases_pkey" PRIMARY KEY ("resource")
);

CREATE TABLE "pipeline_lease_events" (
  "id" TEXT NOT NULL,
  "resource" VARCHAR(100) NOT NULL,
  "type" "PipelineLeaseEventType" NOT NULL,
  "generation" INTEGER NOT NULL,
  "ownerToken" VARCHAR(100),
  "pipelineRunId" TEXT,
  "displacedOwnerToken" VARCHAR(100),
  "displacedPipelineRunId" TEXT,
  "previousExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pipeline_lease_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pipeline_runs_status_nextEligibleAt_idx"
  ON "pipeline_runs"("status", "nextEligibleAt");
CREATE INDEX "pipeline_runs_heartbeatAt_idx" ON "pipeline_runs"("heartbeatAt");
CREATE INDEX "pipeline_runs_createdAt_idx" ON "pipeline_runs"("createdAt");

CREATE UNIQUE INDEX "pipeline_stage_runs_pipelineRunId_stage_key"
  ON "pipeline_stage_runs"("pipelineRunId", "stage");
CREATE INDEX "pipeline_stage_runs_pipelineRunId_status_idx"
  ON "pipeline_stage_runs"("pipelineRunId", "status");
CREATE INDEX "pipeline_stage_runs_stage_status_idx"
  ON "pipeline_stage_runs"("stage", "status");
CREATE INDEX "pipeline_stage_runs_heartbeatAt_idx"
  ON "pipeline_stage_runs"("heartbeatAt");

CREATE INDEX "pipeline_leases_expiresAt_idx" ON "pipeline_leases"("expiresAt");
CREATE INDEX "pipeline_leases_pipelineRunId_idx"
  ON "pipeline_leases"("pipelineRunId");

CREATE INDEX "pipeline_lease_events_resource_createdAt_idx"
  ON "pipeline_lease_events"("resource", "createdAt");
CREATE INDEX "pipeline_lease_events_pipelineRunId_createdAt_idx"
  ON "pipeline_lease_events"("pipelineRunId", "createdAt");
CREATE INDEX "pipeline_lease_events_displacedPipelineRunId_createdAt_idx"
  ON "pipeline_lease_events"("displacedPipelineRunId", "createdAt");

ALTER TABLE "pipeline_stage_runs"
  ADD CONSTRAINT "pipeline_stage_runs_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pipeline_leases"
  ADD CONSTRAINT "pipeline_leases_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pipeline_lease_events"
  ADD CONSTRAINT "pipeline_lease_events_resource_fkey"
  FOREIGN KEY ("resource") REFERENCES "pipeline_leases"("resource")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pipeline_lease_events"
  ADD CONSTRAINT "pipeline_lease_events_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pipeline_lease_events"
  ADD CONSTRAINT "pipeline_lease_events_displacedPipelineRunId_fkey"
  FOREIGN KEY ("displacedPipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
