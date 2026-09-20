-- CreateEnum
CREATE TYPE "ChatMessageVisibility" AS ENUM ('public', 'private', 'gm');

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "visibility" "ChatMessageVisibility" NOT NULL DEFAULT 'public';
