import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sem 0/O/1/I pra evitar confusão

function generateCodigo(): string {
  let codigo = "";
  for (let i = 0; i < 6; i++) codigo += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return codigo;
}

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const mesas = await prisma.mesa.findMany({
    where: { membros: { some: { userId: user.id } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(mesas);
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";

  if (!nome) return NextResponse.json({ error: "Dê um nome pra mesa." }, { status: 400 });
  if (senha.length < 4) return NextResponse.json({ error: "Senha precisa ter ao menos 4 caracteres." }, { status: 400 });

  const senhaHash = await bcrypt.hash(senha, 10);

  let codigo = generateCodigo();
  for (let tentativas = 0; tentativas < 5; tentativas++) {
    const existente = await prisma.mesa.findUnique({ where: { codigo } });
    if (!existente) break;
    codigo = generateCodigo();
  }

  const mesa = await prisma.mesa.create({
    data: {
      nome,
      codigo,
      senhaHash,
      ownerId: user.id,
      membros: { create: { userId: user.id } },
    },
  });

  return NextResponse.json({ id: mesa.id, codigo: mesa.codigo }, { status: 201 });
}
