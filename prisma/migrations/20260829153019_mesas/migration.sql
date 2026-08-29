-- AlterTable (nullable por enquanto — preenchidas pelo backfill abaixo antes do NOT NULL)
ALTER TABLE "ChatMessage" ADD COLUMN     "mesaId" TEXT;

-- AlterTable
ALTER TABLE "Sheet" ADD COLUMN     "mesaId" TEXT;

-- CreateTable
CREATE TABLE "Mesa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MesaMembro" (
    "id" TEXT NOT NULL,
    "mesaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MesaMembro_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_codigo_key" ON "Mesa"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "MesaMembro_mesaId_userId_key" ON "MesaMembro"("mesaId", "userId");

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaMembro" ADD CONSTRAINT "MesaMembro_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MesaMembro" ADD CONSTRAINT "MesaMembro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: cria uma "Mesa Principal" pro dado que já existia antes do sistema de mesas
-- (dono = usuário mais antigo), migra Sheet/ChatMessage existentes pra ela, e adiciona como
-- membros todo mundo que já era dono de ficha ou autor de mensagem. Senha temporária de
-- bcrypt("trocar-depois-123") — troque depois de aplicar, ou ignore já que os membros
-- existentes já foram adicionados automaticamente e não precisam entrar de novo com a senha.
DO $$
DECLARE
  default_user_id TEXT;
  default_mesa_id TEXT := 'legado00000000000mesa';
BEGIN
  SELECT id INTO default_user_id FROM "User" ORDER BY "createdAt" ASC LIMIT 1;
  IF default_user_id IS NOT NULL THEN
    INSERT INTO "Mesa" (id, nome, codigo, "senhaHash", "ownerId", "createdAt")
    VALUES (
      default_mesa_id,
      'Mesa Principal',
      'LEGADO1',
      '$2b$10$o8nnyLD0JSBl2k0CK4B/reu9eWOKe2fuCpvzGuLWTWZrzFof2p3Si',
      default_user_id,
      CURRENT_TIMESTAMP
    );

    UPDATE "Sheet" SET "mesaId" = default_mesa_id WHERE "mesaId" IS NULL;
    UPDATE "ChatMessage" SET "mesaId" = default_mesa_id WHERE "mesaId" IS NULL;

    INSERT INTO "MesaMembro" (id, "mesaId", "userId", "joinedAt")
    SELECT 'mm_' || u.id, default_mesa_id, u.id, CURRENT_TIMESTAMP
    FROM (
      SELECT "ownerId" AS id FROM "Sheet" WHERE "mesaId" = default_mesa_id
      UNION
      SELECT "authorId" AS id FROM "ChatMessage" WHERE "mesaId" = default_mesa_id AND "authorId" IS NOT NULL
      UNION
      SELECT default_user_id AS id
    ) u
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- AlterTable: agora que todo mundo tem mesaId, torna obrigatório e cria os índices/FKs finais.
ALTER TABLE "ChatMessage" ALTER COLUMN "mesaId" SET NOT NULL;
ALTER TABLE "Sheet" ALTER COLUMN "mesaId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "ChatMessage_mesaId_idx" ON "ChatMessage"("mesaId");

-- CreateIndex
CREATE INDEX "Sheet_mesaId_idx" ON "Sheet"("mesaId");

-- AddForeignKey
ALTER TABLE "Sheet" ADD CONSTRAINT "Sheet_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
