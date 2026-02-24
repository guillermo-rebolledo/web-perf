-- CreateTable
CREATE TABLE "RegressionBaseline" (
    "id" TEXT NOT NULL,
    "monitorId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "medianValue" DOUBLE PRECISION NOT NULL,
    "sampleSize" INTEGER NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegressionBaseline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegressionAlert" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "baselineValue" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "delta" DOUBLE PRECISION NOT NULL,
    "percentChange" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "likelyCauses" JSONB,
    "diffSummary" JSONB,
    "status" TEXT NOT NULL DEFAULT 'open',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegressionAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegressionBaseline_monitorId_idx" ON "RegressionBaseline"("monitorId");

-- CreateIndex
CREATE UNIQUE INDEX "RegressionBaseline_monitorId_metricName_key" ON "RegressionBaseline"("monitorId", "metricName");

-- CreateIndex
CREATE INDEX "RegressionAlert_runId_idx" ON "RegressionAlert"("runId");

-- CreateIndex
CREATE INDEX "RegressionAlert_status_idx" ON "RegressionAlert"("status");

-- CreateIndex
CREATE INDEX "RegressionAlert_severity_idx" ON "RegressionAlert"("severity");

-- AddForeignKey
ALTER TABLE "RegressionBaseline" ADD CONSTRAINT "RegressionBaseline_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "Monitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegressionAlert" ADD CONSTRAINT "RegressionAlert_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE CASCADE ON UPDATE CASCADE;
