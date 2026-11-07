-- CreateEnum
CREATE TYPE "RuleProposalStatus" AS ENUM ('PROPOSED', 'APPLIED', 'DISMISSED');

-- CreateTable
CREATE TABLE "rule_proposals" (
    "id" UUID NOT NULL,
    "team" TEXT NOT NULL,
    "taskId" UUID,
    "title" TEXT NOT NULL,
    "applies" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "why" TEXT NOT NULL,
    "check" TEXT,
    "source" TEXT NOT NULL,
    "status" "RuleProposalStatus" NOT NULL DEFAULT 'PROPOSED',
    "ruleId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMPTZ(3),

    CONSTRAINT "rule_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rule_proposals_status_createdAt_idx" ON "rule_proposals"("status", "createdAt");
