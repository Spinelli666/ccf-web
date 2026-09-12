import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const sheet = await prisma.sheet.findUnique({
    where: { id },
    include: { owner: { select: { id: true, displayName: true, username: true } }, mesa: { select: { ownerId: true } } },
  });
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(sheet.mesaId);
  if (!user) return response;

  const isGM = sheet.mesa.ownerId === user.id;
  if (sheet.private && sheet.ownerId !== user.id && !isGM) {
    return NextResponse.json({ error: "Ficha privada." }, { status: 403 });
  }
  return NextResponse.json(sheet);
}

export async function PUT(req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.sheet.findUnique({ where: { id }, include: { mesa: { select: { ownerId: true } } } });
  if (!existing) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(existing.mesaId);
  if (!user) return response;

  const isOwner = existing.ownerId === user.id;
  const isGM = existing.mesa.ownerId === user.id;
  const canEditContent = isOwner || isGM || existing.editableByOthers;
  if (!canEditContent) {
    return NextResponse.json({ error: "Você não tem permissão pra editar essa ficha." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const data: { name?: string; data?: object; private?: boolean; editableByOthers?: boolean; folderId?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
  if (body.data !== undefined) data.data = body.data;

  if (typeof body.private === "boolean") {
    if (!isOwner && !isGM) {
      return NextResponse.json({ error: "Só o dono da ficha ou o Mestre podem mudar a privacidade." }, { status: 403 });
    }
    data.private = body.private;
  }
  if (typeof body.editableByOthers === "boolean") {
    if (!isOwner) {
      return NextResponse.json({ error: "Só o dono da ficha pode permitir que outros a editem." }, { status: 403 });
    }
    data.editableByOthers = body.editableByOthers;
  }
  if (body.folderId !== undefined) {
    if (!isOwner && !isGM) {
      return NextResponse.json({ error: "Só o dono da ficha ou o Mestre podem mover ela de pasta." }, { status: 403 });
    }
    if (body.folderId === null) {
      data.folderId = null;
    } else if (typeof body.folderId === "string") {
      const folder = await prisma.sheetFolder.findUnique({ where: { id: body.folderId } });
      if (!folder || folder.mesaId !== existing.mesaId) {
        return NextResponse.json({ error: "Pasta inválida." }, { status: 400 });
      }
      data.folderId = body.folderId;
    }
  }

  const sheet = await prisma.sheet.update({ where: { id }, data });
  return NextResponse.json(sheet);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.sheet.findUnique({ where: { id }, include: { mesa: { select: { ownerId: true } } } });
  if (!existing) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });

  const { user, response } = await requireMesaMember(existing.mesaId);
  if (!user) return response;

  const isOwner = existing.ownerId === user.id;
  const isGM = existing.mesa.ownerId === user.id;
  if (!isOwner && !isGM) {
    return NextResponse.json({ error: "Só o dono da ficha ou o Mestre podem apagá-la." }, { status: 403 });
  }

  await prisma.sheet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
