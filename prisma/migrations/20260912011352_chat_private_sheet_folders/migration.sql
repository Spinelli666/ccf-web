-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "sheetPrivate" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "SheetFolder" (
    "id" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "private" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SheetFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SheetFolder_mesaId_idx" ON "SheetFolder"("mesaId");

-- CreateIndex
CREATE INDEX "Sheet_folderId_idx" ON "Sheet"("folderId");

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "SheetFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetFolder" ADD CONSTRAINT "SheetFolder_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SheetFolder" ADD CONSTRAINT "SheetFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
