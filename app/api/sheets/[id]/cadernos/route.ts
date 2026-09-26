import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sheetAccess, podeLerCaderno, soDono, limitarTexto, MAX_TITULO } from "@/lib/caderno-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const { access, response } = await sheetAccess(id);
  if (!access) return response;

  const cadernos = await prisma.caderno.findMany({
    where: { sheetId: id },
    orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
    include: { paginas: { orderBy: [{ ordem: "asc" }, { createdAt: "asc" }] } },
  });
  return NextResponse.json(cadernos.filter((c) => podeLerCaderno(access, c)));
}

export async function POST(req: Request, { params }: Params) {
  const { id } = await params;
  const { access, response } = await sheetAccess(id);
  if (!access) return response;
  if (!access.isOwner) return soDono();

  const body = await req.json().catch(() => null);
  const titulo = limitarTexto(body?.titulo, MAX_TITULO)?.trim() || "Novo caderno";
  const ultimo = await prisma.caderno.findFirst({ where: { sheetId: id }, orderBy: { ordem: "desc" } });

  const caderno = await prisma.caderno.create({
    data: {
      sheetId: id,
      titulo,
      ordem: (ultimo?.ordem ?? -1) + 1,
      paginas: { create: { titulo: "Página 1", conteudo: "", ordem: 0 } },
    },
    include: { paginas: true },
  });
  return NextResponse.json(caderno, { status: 201 });
}
