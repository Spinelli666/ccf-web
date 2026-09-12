import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.sheetFolder.findUnique({ where: { id }, include: { mesa: { select: { ownerId: true } } } });
  if (!existing) return NextResponse.json({ error: "Pasta não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(existing.mesaId);
  if (!user) return response;

  const isOwner = existing.ownerId === user.id;
  const isGM = existing.mesa.ownerId === user.id;
  if (!isOwner && !isGM) {
    return NextResponse.json({ error: "Só o dono da pasta ou o Mestre podem editá-la." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const data: { nome?: string; private?: boolean } = {};
  if (typeof body.nome === "string" && body.nome.trim()) data.nome = body.nome.trim();
  if (typeof body.private === "boolean") data.private = body.private;

  const folder = await prisma.sheetFolder.update({ where: { id }, data });
  return NextResponse.json(folder);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.sheetFolder.findUnique({ where: { id }, include: { mesa: { select: { ownerId: true } } } });
  if (!existing) return NextResponse.json({ error: "Pasta não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(existing.mesaId);
  if (!user) return response;

  const isOwner = existing.ownerId === user.id;
  const isGM = existing.mesa.ownerId === user.id;
  if (!isOwner && !isGM) {
    return NextResponse.json({ error: "Só o dono da pasta ou o Mestre podem apagá-la." }, { status: 403 });
  }

  await prisma.sheetFolder.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
