-- CreateEnum
CREATE TYPE "QuestionValidationStatus" AS ENUM ('pending', 'validated', 'rejected', 'needs_reformulation');

-- CreateEnum
CREATE TYPE "Stance" AS ENUM ('YesItSeemsSo', 'ProbablyYes', 'Unclear', 'ProbablyNot', 'NoItDoesntSeemSo');

-- CreateEnum
CREATE TYPE "VerdictLabel" AS ENUM ('YesItSeemsSo', 'ProbablyYes', 'Unclear', 'ProbablyNot', 'NoItDoesntSeemSo');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('Why', 'Dissent', 'Unknown');

-- CreateTable
CREATE TABLE "topics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "safetyNoteRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "originalQuestionText" TEXT,
    "extractedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,
    "sourceArticlesCount" INTEGER NOT NULL DEFAULT 0,
    "validationStatus" "QuestionValidationStatus" NOT NULL DEFAULT 'pending',
    "validationResults" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_articles" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "topic_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_analyses" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "stance" "Stance" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "reasoning" TEXT,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "article_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verdicts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "verdictLabel" "VerdictLabel" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "supportShare" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verdicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence_bullets" (
    "id" TEXT NOT NULL,
    "verdictId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "articleId" TEXT,
    "type" "EvidenceType" NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evidence_bullets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_name_key" ON "topics"("name");

-- CreateIndex
CREATE INDEX "questions_topicId_idx" ON "questions"("topicId");

-- CreateIndex
CREATE INDEX "questions_isActive_idx" ON "questions"("isActive");

-- CreateIndex
CREATE INDEX "questions_validationStatus_idx" ON "questions"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "topic_articles_topicId_articleId_key" ON "topic_articles"("topicId", "articleId");

-- CreateIndex
CREATE INDEX "topic_articles_topicId_idx" ON "topic_articles"("topicId");

-- CreateIndex
CREATE INDEX "topic_articles_articleId_idx" ON "topic_articles"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "article_analyses_articleId_questionId_month_key" ON "article_analyses"("articleId", "questionId", "month");

-- CreateIndex
CREATE INDEX "article_analyses_questionId_idx" ON "article_analyses"("questionId");

-- CreateIndex
CREATE INDEX "article_analyses_articleId_idx" ON "article_analyses"("articleId");

-- CreateIndex
CREATE INDEX "article_analyses_month_idx" ON "article_analyses"("month");

-- CreateIndex
CREATE INDEX "article_analyses_questionId_month_idx" ON "article_analyses"("questionId", "month");

-- CreateIndex
CREATE INDEX "article_analyses_stance_idx" ON "article_analyses"("stance");

-- CreateIndex
CREATE UNIQUE INDEX "verdicts_questionId_key" ON "verdicts"("questionId");

-- CreateIndex
CREATE INDEX "verdicts_verdictLabel_idx" ON "verdicts"("verdictLabel");

-- CreateIndex
CREATE INDEX "verdicts_confidence_idx" ON "verdicts"("confidence");

-- CreateIndex
CREATE INDEX "evidence_bullets_verdictId_idx" ON "evidence_bullets"("verdictId");

-- CreateIndex
CREATE INDEX "evidence_bullets_type_idx" ON "evidence_bullets"("type");

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_articles" ADD CONSTRAINT "topic_articles_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_articles" ADD CONSTRAINT "topic_articles_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_analyses" ADD CONSTRAINT "article_analyses_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_analyses" ADD CONSTRAINT "article_analyses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_bullets" ADD CONSTRAINT "evidence_bullets_verdictId_fkey" FOREIGN KEY ("verdictId") REFERENCES "verdicts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence_bullets" ADD CONSTRAINT "evidence_bullets_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

