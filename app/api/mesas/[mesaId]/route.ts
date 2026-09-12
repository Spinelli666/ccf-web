import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function PUT(req: Request, { params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = await params;
  const { user, response } = await requireUser();
  if (!user) return response;

  const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
  if (!mesa) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });
  if (mesa.ownerId !== user.id) {
    return NextResponse.json({ error: "Só o Mestre pode renomear a mesa." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  if (!nome) return NextResponse.json({ error: "Dê um nome pra mesa." }, { status: 400 });

  const atualizada = await prisma.mesa.update({ where: { id: mesaId }, data: { nome } });
  return NextResponse.json({ id: atualizada.id, nome: atualizada.nome });
}
