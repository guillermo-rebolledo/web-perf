-- CreateIndex
CREATE INDEX "RegressionAlert_createdAt_severity_idx" ON "RegressionAlert"("createdAt", "severity");

-- CreateIndex
CREATE INDEX "RegressionAlert_createdAt_status_idx" ON "RegressionAlert"("createdAt", "status");
