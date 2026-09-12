import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

export async function GET(_req: Request, { params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = await params;
  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  const mesa = await prisma.mesa.findUnique({ where: { id: mesaId }, select: { ownerId: true } });
  const isGM = mesa?.ownerId === user.id;

  const folders = await prisma.sheetFolder.findMany({
    where: isGM ? { mesaId } : { mesaId, OR: [{ private: false }, { ownerId: user.id }] },
    orderBy: { nome: "asc" },
  });
  return NextResponse.json(folders);
}

export async function POST(req: Request, { params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = await params;
  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  if (!nome) return NextResponse.json({ error: "Dê um nome pra pasta." }, { status: 400 });

  const folder = await prisma.sheetFolder.create({
    data: { mesaId, nome, ownerId: user.id, private: !!body?.private },
  });
  return NextResponse.json(folder);
}
