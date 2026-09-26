import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sheetAccess, soDono, naoEncontrado, limitarTexto, MAX_TITULO } from "@/lib/caderno-auth";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const caderno = await prisma.caderno.findUnique({ where: { id } });
  if (!caderno) return naoEncontrado();
  const { access, response } = await sheetAccess(caderno.sheetId);
  if (!access) return response;
  if (!access.isOwner) return soDono();

  const body = await req.json().catch(() => null);
  const total = await prisma.cadernoPagina.count({ where: { cadernoId: id } });
  const titulo = limitarTexto(body?.titulo, MAX_TITULO)?.trim() || `Página ${total + 1}`;
  const ultima = await prisma.cadernoPagina.findFirst({ where: { cadernoId: id }, orderBy: { ordem: "desc" } });

  const pagina = await prisma.cadernoPagina.create({
    data: { cadernoId: id, titulo, conteudo: "", ordem: (ultima?.ordem ?? -1) + 1 },
  });
  return NextResponse.json(pagina, { status: 201 });
}
