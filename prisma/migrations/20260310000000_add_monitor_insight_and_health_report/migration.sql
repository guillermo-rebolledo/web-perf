-- AlterTable
ALTER TABLE "Run" ADD COLUMN     "healthReport" TEXT,
ADD COLUMN     "healthReportAt" TIMESTAMP(3),
ADD COLUMN     "healthReportModel" TEXT,
ADD COLUMN     "isFirstRun" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MonitorInsight" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "metricName" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL,
    "recurrenceCount" INTEGER NOT NULL,
    "dominantCause" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,

    CONSTRAINT "MonitorInsight_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonitorInsight_monitorId_idx" ON "MonitorInsight"("monitorId");

-- CreateIndex
CREATE INDEX "MonitorInsight_monitorId_metricName_idx" ON "MonitorInsight"("monitorId", "metricName");

-- CreateIndex
CREATE INDEX "MonitorInsight_generatedAt_idx" ON "MonitorInsight"("generatedAt");

-- AddForeignKey
ALTER TABLE "MonitorInsight" ADD CONSTRAINT "MonitorInsight_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial unique indexes for MonitorInsight (Prisma doesn't support these natively)
CREATE UNIQUE INDEX "MonitorInsight_monitorId_crossMetric_key"
  ON "MonitorInsight"("monitorId")
  WHERE "metricName" IS NULL;

CREATE UNIQUE INDEX "MonitorInsight_monitorId_metricName_key"
  ON "MonitorInsight"("monitorId", "metricName")
  WHERE "metricName" IS NOT NULL;
