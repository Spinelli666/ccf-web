import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const races = await prisma.race.findMany({ orderBy: { nome: "asc" } });
  return NextResponse.json(races);
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.nome !== "string" || !body.nome.trim()) {
    return NextResponse.json({ error: "Nome da raça é obrigatório." }, { status: 400 });
  }

  const race = await prisma.race.upsert({
    where: { nome: body.nome.trim() },
    update: { habilidades: body.habilidades ?? [] },
    create: { nome: body.nome.trim(), habilidades: body.habilidades ?? [], isDefault: false },
  });
  return NextResponse.json(race, { status: 201 });
}
