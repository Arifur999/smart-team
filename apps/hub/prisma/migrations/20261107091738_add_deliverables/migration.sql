-- CreateEnum
CREATE TYPE "DeliverableKind" AS ENUM ('VIDEO', 'IMAGE', 'AUDIO', 'TEXT', 'OTHER');

-- CreateTable
CREATE TABLE "deliverables" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "stepId" UUID,
    "runId" UUID,
    "stage" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" "DeliverableKind" NOT NULL,
    "label" TEXT,
    "storageKey" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "mime" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deliverables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "deliverables_storageKey_key" ON "deliverables"("storageKey");

-- CreateIndex
CREATE INDEX "deliverables_stepId_idx" ON "deliverables"("stepId");

-- CreateIndex
CREATE UNIQUE INDEX "deliverables_taskId_path_version_key" ON "deliverables"("taskId", "path", "version");

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "line_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliverables" ADD CONSTRAINT "deliverables_runId_fkey" FOREIGN KEY ("runId") REFERENCES "runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;