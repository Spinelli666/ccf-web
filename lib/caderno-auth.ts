import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

// Regras de acesso dos cadernos de anotações:
// - só o dono da ficha cria/edita/apaga cadernos e páginas;
// - caderno privado: só o dono lê;
// - caderno público: quem pode ver a ficha (membros da mesa, ou só dono+Mestre se a ficha é privada) lê.

export type SheetAccess = {
  userId: string;
  isOwner: boolean;
  canSeeSheet: boolean;
};

export async function sheetAccess(sheetId: string) {
  const sheet = await prisma.sheet.findUnique({
    where: { id: sheetId },
    select: { id: true, mesaId: true, ownerId: true, private: true, mesa: { select: { ownerId: true } } },
  });
  if (!sheet) {
    return { access: null, response: NextResponse.json({ error: "Ficha não encontrada." }, { status: 404 }) };
  }
  const { user, response } = await requireMesaMember(sheet.mesaId);
  if (!user) return { access: null, response };
  const isOwner = sheet.ownerId === user.id;
  const isGM = sheet.mesa.ownerId === user.id;
  const access: SheetAccess = { userId: user.id, isOwner, canSeeSheet: !sheet.private || isOwner || isGM };
  return { access, response: null };
}

export function podeLerCaderno(access: SheetAccess, caderno: { publico: boolean }) {
  return access.isOwner || (caderno.publico && access.canSeeSheet);
}

export function soDono() {
  return NextResponse.json({ error: "Só o dono da ficha pode editar as anotações." }, { status: 403 });
}

export function naoEncontrado() {
  return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
}

export function limitarTexto(v: unknown, max: number): string | undefined {
  return typeof v === "string" ? v.slice(0, max) : undefined;
}

export const MAX_TITULO = 120;
export const MAX_CONTEUDO = 200_000;
