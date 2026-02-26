-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'success', 'failed');

-- AlterTable: cast VARCHAR → RunStatus in-place (no data loss)
-- Must drop default before changing type, then restore it
ALTER TABLE "Run" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Run" ALTER COLUMN "status" TYPE "RunStatus" USING "status"::"RunStatus";
ALTER TABLE "Run" ALTER COLUMN "status" SET DEFAULT 'queued'::"RunStatus";
