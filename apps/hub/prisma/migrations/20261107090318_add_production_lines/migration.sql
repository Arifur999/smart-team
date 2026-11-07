-- CreateEnum
CREATE TYPE "StepKind" AS ENUM ('WORK', 'GATE', 'CHECK');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('ACTIVE', 'WAITING', 'DONE', 'SENT_BACK', 'SKIPPED', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "attempt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "failure" TEXT,
ADD COLUMN     "report" JSONB,
ADD COLUMN     "resumeSessionId" TEXT,
ADD COLUMN     "role" JSONB,
ADD COLUMN     "routedAt" TIMESTAMPTZ(3),
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "stepId" UUID;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "folder" TEXT,
ADD COLUMN     "line" TEXT,
ADD COLUMN     "lineSettings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "resumeAt" TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "line_steps" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "stage" TEXT NOT NULL,
    "kind" "StepKind" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "status" "StepStatus" NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'line',
    "notes" JSONB NOT NULL DEFAULT '[]',
    "result" JSONB,
    "score" INTEGER,
    "summary" TEXT,
    "route" JSONB,
    "comment" TEXT,
    "decidedBy" TEXT,
    "causedById" UUID,
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "line_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "line_steps_taskId_createdAt_idx" ON "line_steps"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "runs_stepId_createdAt_idx" ON "runs"("stepId", "createdAt");

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "line_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_steps" ADD CONSTRAINT "line_steps_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_steps" ADD CONSTRAINT "line_steps_causedById_fkey" FOREIGN KEY ("causedById") REFERENCES "line_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

