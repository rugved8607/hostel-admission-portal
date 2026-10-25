/*
  Warnings:

  - You are about to drop the column `round` on the `Allotment` table. All the data in the column will be lost.
  - You are about to drop the column `allocationStatus` on the `StudentGroup` table. All the data in the column will be lost.
  - You are about to drop the column `isLocked` on the `StudentGroup` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[allottedGroupId]` on the table `Room` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('FORMING', 'SUBMITTED', 'ALLOTTED', 'UNALLOTTED', 'DISSOLVED');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('DRAFT', 'FORMATION_OPEN', 'FORMATION_CLOSED', 'ALLOCATED', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TieBreakRule" AS ENUM ('ROLL_NO_ASC', 'MAX_CGPA_THEN_ROLL_NO', 'GROUP_CREATED_ASC');

-- AlterTable
ALTER TABLE "Allotment" DROP COLUMN "round",
ADD COLUMN     "roundId" TEXT;

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "allottedGroupId" TEXT;

-- AlterTable
ALTER TABLE "StudentGroup" DROP COLUMN "allocationStatus",
DROP COLUMN "isLocked",
ADD COLUMN     "dissolvedAt" TIMESTAMP(3),
ADD COLUMN     "roundId" TEXT,
ADD COLUMN     "status" "GroupStatus" NOT NULL DEFAULT 'FORMING';

-- DropEnum
DROP TYPE "AllocationStatus";

-- CreateTable
CREATE TABLE "AllocationRound" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'DRAFT',
    "tieBreakRule" "TieBreakRule" NOT NULL DEFAULT 'MAX_CGPA_THEN_ROLL_NO',
    "formationDeadline" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllocationRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoundGroupSnapshot" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupSize" INTEGER NOT NULL,
    "averageCgpa" DOUBLE PRECISION NOT NULL,
    "maxCgpa" DOUBLE PRECISION NOT NULL,
    "rank" INTEGER NOT NULL,
    "tieBreakNote" TEXT,
    "preferences" JSONB NOT NULL DEFAULT '[]',
    "members" JSONB NOT NULL,
    "result" TEXT NOT NULL,
    "roomId" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoundGroupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllocationRound_number_key" ON "AllocationRound"("number");

-- CreateIndex
CREATE INDEX "RoundGroupSnapshot_roundId_idx" ON "RoundGroupSnapshot"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "RoundGroupSnapshot_roundId_groupId_key" ON "RoundGroupSnapshot"("roundId", "groupId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Room_allottedGroupId_key" ON "Room"("allottedGroupId");

-- CreateIndex
CREATE INDEX "StudentGroup_status_idx" ON "StudentGroup"("status");

-- CreateIndex
CREATE INDEX "StudentGroup_roundId_idx" ON "StudentGroup"("roundId");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_allottedGroupId_fkey" FOREIGN KEY ("allottedGroupId") REFERENCES "StudentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentGroup" ADD CONSTRAINT "StudentGroup_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "AllocationRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allotment" ADD CONSTRAINT "Allotment_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "AllocationRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundGroupSnapshot" ADD CONSTRAINT "RoundGroupSnapshot_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "AllocationRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
