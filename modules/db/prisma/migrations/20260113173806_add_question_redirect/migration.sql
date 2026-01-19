-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "question_redirects" (
    "id" TEXT NOT NULL,
    "oldQuestionId" TEXT NOT NULL,
    "newQuestionId" TEXT NOT NULL,
    "convergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent - drop first if exists)
DROP INDEX IF EXISTS "question_redirects_oldQuestionId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "question_redirects_oldQuestionId_key" ON "question_redirects"("oldQuestionId");

DROP INDEX IF EXISTS "question_redirects_oldQuestionId_idx";
CREATE INDEX IF NOT EXISTS "question_redirects_oldQuestionId_idx" ON "question_redirects"("oldQuestionId");

DROP INDEX IF EXISTS "question_redirects_newQuestionId_idx";
CREATE INDEX IF NOT EXISTS "question_redirects_newQuestionId_idx" ON "question_redirects"("newQuestionId");

-- AddForeignKey (idempotent - drop first if exists)
ALTER TABLE "question_redirects" DROP CONSTRAINT IF EXISTS "question_redirects_oldQuestionId_fkey";
ALTER TABLE "question_redirects" ADD CONSTRAINT "question_redirects_oldQuestionId_fkey" FOREIGN KEY ("oldQuestionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "question_redirects" DROP CONSTRAINT IF EXISTS "question_redirects_newQuestionId_fkey";
ALTER TABLE "question_redirects" ADD CONSTRAINT "question_redirects_newQuestionId_fkey" FOREIGN KEY ("newQuestionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
