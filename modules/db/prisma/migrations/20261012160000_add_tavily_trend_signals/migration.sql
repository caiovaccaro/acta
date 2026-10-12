-- Additive Tavily search logs and trend signals. Existing application
-- tables and rows are not altered. API keys are never stored.

CREATE TABLE "tavily_search_logs" (
  "id" TEXT NOT NULL,
  "day" VARCHAR(10) NOT NULL,
  "month" VARCHAR(7) NOT NULL,
  "queryGroup" VARCHAR(100) NOT NULL,
  "query" VARCHAR(500) NOT NULL,
  "status" VARCHAR(40) NOT NULL,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "pipelineRunId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tavily_search_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "tavily_search_logs_day_idx" ON "tavily_search_logs"("day");
CREATE INDEX "tavily_search_logs_month_idx" ON "tavily_search_logs"("month");
CREATE INDEX "tavily_search_logs_pipelineRunId_createdAt_idx"
  ON "tavily_search_logs"("pipelineRunId", "createdAt");

CREATE TABLE "trend_signals" (
  "id" TEXT NOT NULL,
  "query" VARCHAR(500) NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "url" VARCHAR(2000) NOT NULL,
  "domain" VARCHAR(255) NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "matchedTopicId" TEXT,
  "matchedArticleId" TEXT,
  "matchedCrawlRequestId" TEXT,
  "pipelineRunId" TEXT,
  "rawResult" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "trend_signals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trend_signals_url_key" ON "trend_signals"("url");
CREATE INDEX "trend_signals_domain_createdAt_idx"
  ON "trend_signals"("domain", "createdAt");
CREATE INDEX "trend_signals_pipelineRunId_createdAt_idx"
  ON "trend_signals"("pipelineRunId", "createdAt");
CREATE INDEX "trend_signals_createdAt_idx" ON "trend_signals"("createdAt");

ALTER TABLE "tavily_search_logs"
  ADD CONSTRAINT "tavily_search_logs_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "trend_signals"
  ADD CONSTRAINT "trend_signals_pipelineRunId_fkey"
  FOREIGN KEY ("pipelineRunId") REFERENCES "pipeline_runs"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
