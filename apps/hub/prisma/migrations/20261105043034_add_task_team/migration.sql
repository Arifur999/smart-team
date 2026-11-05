-- CreateEnum
CREATE TYPE "Team" AS ENUM ('nextDev', 'nextEditor', 'nextDesign', 'NextMarketer');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "team" "Team" NOT NULL DEFAULT 'nextDev';

-- CreateIndex
CREATE INDEX "tasks_team_createdAt_idx" ON "tasks"("team", "createdAt");
