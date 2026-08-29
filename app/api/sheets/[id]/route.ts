import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const sheet = await prisma.sheet.findUnique({
    where: { id },
    include: { owner: { select: { id: true, displayName: true, username: true } } },
  });
  if (!sheet) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
  if (sheet.private && sheet.ownerId !== user.id) {
    return NextResponse.json({ error: "Ficha privada." }, { status: 403 });
  }
  return NextResponse.json(sheet);
}

export async function PUT(req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.sheet.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Você só pode editar suas próprias fichas." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });

  const sheet = await prisma.sheet.update({
    where: { id },
    data: {
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : existing.name,
      private: typeof body.private === "boolean" ? body.private : existing.private,
      data: body.data ?? existing.data,
    },
  });
  return NextResponse.json(sheet);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { id } = await params;
  const existing = await prisma.sheet.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 });
  if (existing.ownerId !== user.id) {
    return NextResponse.json({ error: "Você só pode apagar suas próprias fichas." }, { status: 403 });
  }

  await prisma.sheet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
