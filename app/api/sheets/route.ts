import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const sheets = await prisma.sheet.findMany({
    where: { OR: [{ private: false }, { ownerId: user.id }] },
    include: { owner: { select: { displayName: true, username: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(sheets);
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Nome da ficha é obrigatório." }, { status: 400 });
  }

  const sheet = await prisma.sheet.create({
    data: {
      ownerId: user.id,
      name: body.name.trim(),
      private: !!body.private,
      data: body.data ?? {},
    },
  });
  return NextResponse.json(sheet, { status: 201 });
}
