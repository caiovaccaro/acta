-- CreateTable
CREATE TABLE "question_redirects" (
    "id" TEXT NOT NULL,
    "oldQuestionId" TEXT NOT NULL,
    "newQuestionId" TEXT NOT NULL,
    "convergedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_redirects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "question_redirects_oldQuestionId_key" ON "question_redirects"("oldQuestionId");

-- CreateIndex
CREATE INDEX "question_redirects_oldQuestionId_idx" ON "question_redirects"("oldQuestionId");

-- CreateIndex
CREATE INDEX "question_redirects_newQuestionId_idx" ON "question_redirects"("newQuestionId");

-- AddForeignKey
ALTER TABLE "question_redirects" ADD CONSTRAINT "question_redirects_oldQuestionId_fkey" FOREIGN KEY ("oldQuestionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_redirects" ADD CONSTRAINT "question_redirects_newQuestionId_fkey" FOREIGN KEY ("newQuestionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

