-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "benchmarkIndex" DOUBLE PRECISION,
ADD COLUMN     "browserUserAgent" TEXT,
ADD COLUMN     "emulatedFormFactor" TEXT;
