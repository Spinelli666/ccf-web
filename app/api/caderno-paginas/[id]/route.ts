import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  sheetAccess,
  soDono,
  naoEncontrado,
  limitarTexto,
  MAX_TITULO,
  MAX_CONTEUDO,
} from "@/lib/caderno-auth";

type Params = { params: Promise<{ id: string }> };

async function carregar(id: string) {
  const pagina = await prisma.cadernoPagina.findUnique({
    where: { id },
    include: { caderno: { select: { sheetId: true } } },
  });
  if (!pagina) return { pagina: null, response: naoEncontrado() };
  const { access, response } = await sheetAccess(pagina.caderno.sheetId);
  if (!access) return { pagina: null, response };
  if (!access.isOwner) return { pagina: null, response: soDono() };
  return { pagina, response: null };
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  const { pagina, response } = await carregar(id);
  if (!pagina) return response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  const data: { titulo?: string; conteudo?: string } = {};
  const titulo = limitarTexto(body.titulo, MAX_TITULO)?.trim();
  if (titulo) data.titulo = titulo;
  const conteudo = limitarTexto(body.conteudo, MAX_CONTEUDO);
  if (conteudo !== undefined) data.conteudo = conteudo;

  const atualizada = await prisma.cadernoPagina.update({ where: { id }, data });
  return NextResponse.json(atualizada);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const { pagina, response } = await carregar(id);
  if (!pagina) return response;
  const restantes = await prisma.cadernoPagina.count({ where: { cadernoId: pagina.cadernoId } });
  if (restantes <= 1) {
    return NextResponse.json({ error: "O caderno precisa ter pelo menos uma página." }, { status: 400 });
  }
  await prisma.cadernoPagina.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
