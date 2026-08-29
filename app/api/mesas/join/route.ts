import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const codigo = typeof body?.codigo === "string" ? body.codigo.trim().toUpperCase() : "";
  const senha = typeof body?.senha === "string" ? body.senha : "";

  if (!codigo || !senha) {
    return NextResponse.json({ error: "Informe o código e a senha da mesa." }, { status: 400 });
  }

  const mesa = await prisma.mesa.findUnique({ where: { codigo } });
  if (!mesa) return NextResponse.json({ error: "Código não encontrado." }, { status: 404 });

  const valid = await bcrypt.compare(senha, mesa.senhaHash);
  if (!valid) return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });

  await prisma.mesaMembro.upsert({
    where: { mesaId_userId: { mesaId: mesa.id, userId: user.id } },
    create: { mesaId: mesa.id, userId: user.id },
    update: {},
  });

  return NextResponse.json({ id: mesa.id });
}
