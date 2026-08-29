import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mesaId = searchParams.get("mesaId") || "";
  if (!mesaId) return NextResponse.json({ error: "mesaId é obrigatório." }, { status: 400 });

  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  const combate = await prisma.combate.findUnique({
    where: { mesaId },
    include: {
      participantes: {
        orderBy: { ordem: "asc" },
        include: { sheet: { select: { ownerId: true } } },
      },
    },
  });
  if (!combate) return NextResponse.json(null);

  return NextResponse.json({
    id: combate.id,
    mesaId: combate.mesaId,
    rodada: combate.rodada,
    turnoAtualIndex: combate.turnoAtualIndex,
    participantes: combate.participantes.map((p) => ({
      id: p.id,
      sheetId: p.sheetId,
      sheetOwnerId: p.sheet?.ownerId ?? null,
      nome: p.nome,
      iniciativa: p.iniciativa,
      ordem: p.ordem,
      mostrarStatus: p.mostrarStatus,
    })),
  });
}
