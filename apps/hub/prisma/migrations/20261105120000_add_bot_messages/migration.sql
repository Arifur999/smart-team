-- CreateEnum
CREATE TYPE "BotRole" AS ENUM ('YOU', 'BOT');

-- CreateTable
CREATE TABLE "bot_messages" (
    "id" UUID NOT NULL,
    "role" "BotRole" NOT NULL,
    "text" TEXT NOT NULL,
    "team" "Team",
    "actions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_messages_createdAt_idx" ON "bot_messages"("createdAt");