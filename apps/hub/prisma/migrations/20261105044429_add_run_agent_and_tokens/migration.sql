-- AlterTable
ALTER TABLE "runs" ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inputTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outputTokens" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "runs_agentId_status_idx" ON "runs"("agentId", "status");
