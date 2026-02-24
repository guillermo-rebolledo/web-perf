-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "benchmarkIndex" DOUBLE PRECISION,
ADD COLUMN     "browserUserAgent" TEXT,
ADD COLUMN     "cpuSlowdown" DOUBLE PRECISION,
ADD COLUMN     "devicePixelRatio" DOUBLE PRECISION,
ADD COLUMN     "emulatedFormFactor" TEXT,
ADD COLUMN     "screenHeight" INTEGER,
ADD COLUMN     "screenWidth" INTEGER,
ADD COLUMN     "throttlingRtt" INTEGER,
ADD COLUMN     "throttlingThroughput" DOUBLE PRECISION;
