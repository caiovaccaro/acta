-- CreateEnum
CREATE TYPE "Ideology" AS ENUM ('Left', 'Center', 'Right');

-- CreateEnum
CREATE TYPE "CrawlStatus" AS ENUM ('pending', 'in_progress', 'done', 'failed');

-- CreateTable
CREATE TABLE "outlets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ideology" "Ideology" NOT NULL,
    "credibilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "rssFeeds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_requests" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "status" "CrawlStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crawl_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "crawlRequestId" TEXT,
    "outletId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "textContent" TEXT NOT NULL,
    "excerpt" TEXT,
    "publishedDate" TIMESTAMP(3),
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outlets_name_key" ON "outlets"("name");

-- CreateIndex
CREATE INDEX "outlets_ideology_idx" ON "outlets"("ideology");

-- CreateIndex
CREATE INDEX "outlets_credibilityScore_idx" ON "outlets"("credibilityScore");

-- CreateIndex
CREATE UNIQUE INDEX "crawl_requests_url_key" ON "crawl_requests"("url");

-- CreateIndex
CREATE INDEX "crawl_requests_status_idx" ON "crawl_requests"("status");

-- CreateIndex
CREATE INDEX "crawl_requests_outletId_idx" ON "crawl_requests"("outletId");

-- CreateIndex
CREATE INDEX "crawl_requests_createdAt_idx" ON "crawl_requests"("createdAt");

-- CreateIndex
CREATE INDEX "crawl_requests_status_createdAt_idx" ON "crawl_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "articles_url_key" ON "articles"("url");

-- CreateIndex
CREATE UNIQUE INDEX "articles_crawlRequestId_key" ON "articles"("crawlRequestId");

-- CreateIndex
CREATE INDEX "articles_outletId_idx" ON "articles"("outletId");

-- CreateIndex
CREATE INDEX "articles_publishedDate_idx" ON "articles"("publishedDate");

-- CreateIndex
CREATE INDEX "articles_extractedAt_idx" ON "articles"("extractedAt");

-- CreateIndex
CREATE INDEX "articles_url_idx" ON "articles"("url");

-- AddForeignKey
ALTER TABLE "crawl_requests" ADD CONSTRAINT "crawl_requests_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_crawlRequestId_fkey" FOREIGN KEY ("crawlRequestId") REFERENCES "crawl_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

