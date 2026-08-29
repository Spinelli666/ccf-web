import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (username.length < 3) {
    return NextResponse.json({ error: "Usuário precisa ter ao menos 3 caracteres." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Senha precisa ter ao menos 6 caracteres." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "Informe um nome de exibição." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "Esse nome de usuário já está em uso." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { username, passwordHash, displayName },
  });

  return NextResponse.json({ ok: true });
}
