import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/**
 * Duplica uma ficha na mesma mesa e na mesma pasta. A cópia pertence a quem duplicou
 * (dono da ficha ou Mestre). As anotações (cadernos) não vão junto.
 */
export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const original = await prisma.sheet.findUnique({ where: { id }, include: { mesa: { select: { ownerId: true } } } });
  if (!original) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(original.mesaId);
  if (!user) return response;

  const isOwner = original.ownerId === user.id;
  const isGM = original.mesa.ownerId === user.id;
  if (!isOwner && !isGM) {
    return NextResponse.json({ error: "Só o dono da ficha ou o Mestre podem duplicá-la." }, { status: 403 });
  }

  const nome = `${original.name} (cópia)`;
  const dados = original.data && typeof original.data === "object" && !Array.isArray(original.data) ? original.data : {};

  const copia = await prisma.sheet.create({
    data: {
      mesaId: original.mesaId,
      ownerId: user.id,
      name: nome,
      private: original.private,
      folderId: original.folderId,
      data: { ...(dados as Prisma.JsonObject), name: nome },
    },
    include: { owner: { select: { displayName: true, username: true } } },
  });
  return NextResponse.json(copia, { status: 201 });
}
