-- Add featured topic support for homepage curation
ALTER TABLE "topics"
ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "featuredOrder" INTEGER;

CREATE INDEX "topics_isFeatured_idx" ON "topics"("isFeatured");
CREATE INDEX "topics_featuredOrder_idx" ON "topics"("featuredOrder");
