-- CreateEnum
CREATE TYPE "IntakePhase" AS ENUM ('ASKING', 'REVIEWING', 'CLARIFYING', 'READY', 'LOCKED');

-- CreateEnum
CREATE TYPE "Speaker" AS ENUM ('FRIDAY', 'YOU');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('UPLOAD', 'PATH', 'LINK');

-- AlterEnum
ALTER TYPE "RunMode" ADD VALUE 'INTAKE';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "deviceId" UUID,
ADD COLUMN     "workDir" TEXT;

-- CreateTable
CREATE TABLE "briefs" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "phase" "IntakePhase" NOT NULL DEFAULT 'ASKING',
    "answers" JSONB NOT NULL DEFAULT '{}',
    "skipped" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentFieldId" TEXT,
    "summary" TEXT,
    "reviewRounds" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intake_messages" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "speaker" "Speaker" NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intake_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "fieldId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT,
    "path" TEXT,
    "deviceId" UUID,
    "url" TEXT,
    "storageKey" TEXT,
    "size" BIGINT,
    "mime" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "briefs_taskId_key" ON "briefs"("taskId");

-- CreateIndex
CREATE INDEX "intake_messages_taskId_createdAt_idx" ON "intake_messages"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "assets_taskId_fieldId_idx" ON "assets"("taskId", "fieldId");

-- CreateIndex
CREATE INDEX "assets_deviceId_idx" ON "assets"("deviceId");

-- CreateIndex
CREATE INDEX "tasks_deviceId_idx" ON "tasks"("deviceId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intake_messages" ADD CONSTRAINT "intake_messages_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: older tasks run where their first run ran.
UPDATE "tasks" t SET "deviceId" = r."deviceId", "workDir" = r."workDir"
FROM (SELECT DISTINCT ON ("taskId") "taskId", "deviceId", "workDir" FROM "runs" ORDER BY "taskId", "createdAt" ASC) r
WHERE t.id = r."taskId" AND t."deviceId" IS NULL;
