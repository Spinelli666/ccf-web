import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sheetAccess, soDono, naoEncontrado, limitarTexto, MAX_TITULO } from "@/lib/caderno-auth";

type Params = { params: Promise<{ id: string }> };

async function carregar(id: string) {
  const caderno = await prisma.caderno.findUnique({ where: { id } });
  if (!caderno) return { caderno: null, response: naoEncontrado() };
  const { access, response } = await sheetAccess(caderno.sheetId);
  if (!access) return { caderno: null, response };
  if (!access.isOwner) return { caderno: null, response: soDono() };
  return { caderno, response: null };
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { caderno, response } = await carregar(id);
  if (!caderno) return response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const data: { titulo?: string; publico?: boolean } = {};
  const titulo = limitarTexto(body.titulo, MAX_TITULO)?.trim();
  if (titulo) data.titulo = titulo;
  if (typeof body.publico === "boolean") data.publico = body.publico;

  const atualizado = await prisma.caderno.update({ where: { id }, data });
  return NextResponse.json(atualizado);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const { caderno, response } = await carregar(id);
  if (!caderno) return response;
  await prisma.caderno.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
