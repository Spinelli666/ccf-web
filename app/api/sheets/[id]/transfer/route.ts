import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * Transfere uma ficha pra outra mesa. Quem pede precisa ser o dono da ficha ou o Mestre da
 * mesa de origem, e tanto ele quanto o dono da ficha precisam ser membros da mesa de destino.
 * A ficha chega sem pasta; as anotações vão junto. Se ela estava num combate da mesa antiga,
 * o participante fica lá só com o nome (desvinculado da ficha).
 */
export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const sheet = await prisma.sheet.findUnique({ where: { id }, include: { mesa: { select: { ownerId: true } } } });
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(sheet.mesaId);
  if (!user) return response;

  const isOwner = sheet.ownerId === user.id;
  const isGM = sheet.mesa.ownerId === user.id;
  if (!isOwner && !isGM) {
    return NextResponse.json({ error: "Só o dono da ficha ou o Mestre podem transferi-la." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const destinoId = typeof body?.mesaId === "string" ? body.mesaId : "";
  if (!destinoId) return NextResponse.json({ error: "Escolha a mesa de destino." }, { status: 400 });
  if (destinoId === sheet.mesaId) {
    return NextResponse.json({ error: "A ficha já está nessa mesa." }, { status: 400 });
  }

  const membros = await prisma.mesaMembro.findMany({
    where: { mesaId: destinoId, userId: { in: [user.id, sheet.ownerId] } },
    select: { userId: true },
  });
  const ids = new Set(membros.map((m) => m.userId));
  if (!ids.has(user.id)) {
    return NextResponse.json({ error: "Você não é membro da mesa de destino." }, { status: 403 });
  }
  if (!ids.has(sheet.ownerId)) {
    return NextResponse.json(
      { error: "O dono da ficha não é membro da mesa de destino — ele precisa entrar nela primeiro." },
      { status: 400 },
    );
  }

  const [, atualizada] = await prisma.$transaction([
    prisma.combateParticipante.updateMany({ where: { sheetId: id }, data: { sheetId: null } }),
    prisma.sheet.update({ where: { id }, data: { mesaId: destinoId, folderId: null } }),
  ]);
  return NextResponse.json(atualizada);
}
