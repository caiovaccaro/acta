-- AlterTable
ALTER TABLE "questions" ADD COLUMN "suggestions" TEXT[] DEFAULT ARRAY[]::TEXT[];
