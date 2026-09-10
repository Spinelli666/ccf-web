import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** Atualiza nome de exibição, usuário e/ou senha da própria conta. Trocar usuário ou
 * senha exige confirmar a senha atual; trocar só o nome de exibição não. */
export async function PUT(req: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await req.json().catch(() => null);
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : undefined;
  const username = typeof body?.username === "string" ? body.username.trim() : undefined;
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : undefined;
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

  if (displayName !== undefined && !displayName) {
    return NextResponse.json({ error: "Informe um nome de exibição." }, { status: 400 });
  }
  if (username !== undefined && username.length < 3) {
    return NextResponse.json({ error: "Usuário precisa ter ao menos 3 caracteres." }, { status: 400 });
  }
  if (newPassword !== undefined && newPassword.length < 6) {
    return NextResponse.json({ error: "Senha nova precisa ter ao menos 6 caracteres." }, { status: 400 });
  }

  const precisaSenhaAtual = username !== undefined || newPassword !== undefined;
  const atual = await prisma.user.findUnique({ where: { id: user.id } });
  if (!atual) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  if (precisaSenhaAtual) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Informe a senha atual pra confirmar essa troca." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, atual.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
    }
  }

  if (username !== undefined && username !== atual.username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "Esse nome de usuário já está em uso." }, { status: 409 });
    }
  }

  const data: { displayName?: string; username?: string; passwordHash?: string } = {};
  if (displayName !== undefined) data.displayName = displayName;
  if (username !== undefined) data.username = username;
  if (newPassword !== undefined) data.passwordHash = await bcrypt.hash(newPassword, 10);

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ id: updated.id, username: updated.username, displayName: updated.displayName });
}
