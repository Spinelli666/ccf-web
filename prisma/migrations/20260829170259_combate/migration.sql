-- CreateTable
CREATE TABLE "Combate" (
    "id" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "rodada" INTEGER NOT NULL DEFAULT 1,
    "turnoAtualIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Combate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CombateParticipante" (
    "id" TEXT NOT NULL,
    "combateId" TEXT NOT NULL,
    "sheetId" TEXT,
    "nome" TEXT NOT NULL,
    "iniciativa" INTEGER,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "mostrarStatus" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CombateParticipante_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Combate_mesaId_key" ON "Combate"("mesaId");

-- CreateIndex
CREATE INDEX "CombateParticipante_combateId_idx" ON "CombateParticipante"("combateId");

-- AddForeignKey
ALTER TABLE "Combate" ADD CONSTRAINT "Combate_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombateParticipante" ADD CONSTRAINT "CombateParticipante_combateId_fkey" FOREIGN KEY ("combateId") REFERENCES "Combate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CombateParticipante" ADD CONSTRAINT "CombateParticipante_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "Sheet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
