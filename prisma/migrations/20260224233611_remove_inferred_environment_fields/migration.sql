/*
  Warnings:

  - You are about to drop the column `cpuSlowdown` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `devicePixelRatio` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `screenHeight` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `screenWidth` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `throttlingRtt` on the `Run` table. All the data in the column will be lost.
  - You are about to drop the column `throttlingThroughput` on the `Run` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Run" DROP COLUMN "cpuSlowdown",
DROP COLUMN "devicePixelRatio",
DROP COLUMN "screenHeight",
DROP COLUMN "screenWidth",
DROP COLUMN "throttlingRtt",
DROP COLUMN "throttlingThroughput";
