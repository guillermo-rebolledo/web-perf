-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "scored" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Insight" ADD COLUMN     "scored" BOOLEAN NOT NULL DEFAULT false;
