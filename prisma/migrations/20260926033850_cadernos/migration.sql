-- CreateTable
CREATE TABLE "Caderno" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "publico" BOOLEAN NOT NULL DEFAULT false,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caderno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadernoPagina" (
    "id" TEXT NOT NULL,
    "cadernoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL DEFAULT '',
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadernoPagina_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Caderno_sheetId_idx" ON "Caderno"("sheetId");

-- CreateIndex
CREATE INDEX "CadernoPagina_cadernoId_idx" ON "CadernoPagina"("cadernoId");

-- AddForeignKey
ALTER TABLE "Caderno" ADD CONSTRAINT "Caderno_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadernoPagina" ADD CONSTRAINT "CadernoPagina_cadernoId_fkey" FOREIGN KEY ("cadernoId") REFERENCES "Caderno"("id") ON DELETE CASCADE ON UPDATE CASCADE;
