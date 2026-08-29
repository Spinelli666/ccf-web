import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mesaId = searchParams.get("mesaId") || "";
  if (!mesaId) return NextResponse.json({ error: "mesaId é obrigatório." }, { status: 400 });

  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  const sheets = await prisma.sheet.findMany({
    where: { mesaId, OR: [{ private: false }, { ownerId: user.id }] },
    include: { owner: { select: { displayName: true, username: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(sheets);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const mesaId = typeof body?.mesaId === "string" ? body.mesaId : "";
  if (!mesaId) return NextResponse.json({ error: "mesaId é obrigatório." }, { status: 400 });

  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nome da ficha é obrigatório." }, { status: 400 });
  }

  const sheet = await prisma.sheet.create({
    data: {
      mesaId,
      ownerId: user.id,
      name: body.name.trim(),
      private: !!body.private,
      data: body.data ?? {},
    },
  });
  return NextResponse.json(sheet, { status: 201 });
}
