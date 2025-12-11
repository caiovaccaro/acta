-- CreateEnum
CREATE TYPE "MatchClassificationStatus" AS ENUM ('pending', 'classified', 'rejected');

-- CreateTable
CREATE TABLE "article_question_matches" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "matchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,
    "classificationStatus" "MatchClassificationStatus" NOT NULL DEFAULT 'pending',
    "classifiedAt" TIMESTAMP(3),
    "articleAnalysisId" TEXT,
    "rejectedReason" TEXT,
    "llmConfidence" DOUBLE PRECISION,
    "stance" "Stance",

    CONSTRAINT "article_question_matches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_question_matches_articleId_idx" ON "article_question_matches"("articleId");

-- CreateIndex
CREATE INDEX "article_question_matches_questionId_idx" ON "article_question_matches"("questionId");

-- CreateIndex
CREATE INDEX "article_question_matches_matchedAt_idx" ON "article_question_matches"("matchedAt");

-- CreateIndex
CREATE INDEX "article_question_matches_classificationStatus_idx" ON "article_question_matches"("classificationStatus");

-- CreateIndex
CREATE INDEX "article_question_matches_questionId_classificationStatus_idx" ON "article_question_matches"("questionId", "classificationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "article_question_matches_articleId_questionId_key" ON "article_question_matches"("articleId", "questionId");

-- AddForeignKey
ALTER TABLE "article_question_matches" ADD CONSTRAINT "article_question_matches_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_question_matches" ADD CONSTRAINT "article_question_matches_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_question_matches" ADD CONSTRAINT "article_question_matches_articleAnalysisId_fkey" FOREIGN KEY ("articleAnalysisId") REFERENCES "article_analyses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
