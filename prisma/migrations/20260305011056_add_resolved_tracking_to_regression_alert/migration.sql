-- AlterTable
ALTER TABLE "RegressionAlert" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "resolvedBy" TEXT;
