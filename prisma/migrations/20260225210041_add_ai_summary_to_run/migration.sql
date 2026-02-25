-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "aiSummaryAt" TIMESTAMP(3),
ADD COLUMN     "aiSummaryModel" TEXT;
