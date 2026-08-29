import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { user: null, response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { user: session.user, response: null };
}

/** Exige usuário autenticado E membro da mesa (dono ou convidado via código+senha). */
export async function requireMesaMember(mesaId: string) {
  const { user, response } = await requireUser();
  if (!user) return { user: null, response };

  const membro = await prisma.mesaMembro.findUnique({
    where: { mesaId_userId: { mesaId, userId: user.id } },
  });
  if (!membro) {
    return { user: null, response: NextResponse.json({ error: "Você não é membro dessa mesa." }, { status: 403 }) };
  }
  return { user, response: null };
}
