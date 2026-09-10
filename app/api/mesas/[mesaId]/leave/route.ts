import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

export async function POST(req: Request, { params }: { params: Promise<{ mesaId: string }> }) {
  const { mesaId } = await params;
  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  const mesa = await prisma.mesa.findUnique({ where: { id: mesaId } });
  if (!mesa) return NextResponse.json({ error: "Mesa não encontrada." }, { status: 404 });

  if (mesa.ownerId === user.id) {
    return NextResponse.json(
      { error: "Você é o Mestre dessa mesa, não pode sair dela." },
      { status: 400 },
    );
  }

  await prisma.mesaMembro.delete({
    where: { mesaId_userId: { mesaId, userId: user.id } },
  });

  return NextResponse.json({ ok: true });
}
