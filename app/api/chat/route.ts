import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mesaId = searchParams.get("mesaId") || "";
  if (!mesaId) return NextResponse.json({ error: "mesaId é obrigatório." }, { status: 400 });

  const { user, response, isGM } = await requireMesaMember(mesaId);
  if (!user) return response;

  const take = Math.min(500, Math.max(1, Number(searchParams.get("take")) || 50));

  // "private"/"gm" filtram de verdade (diferente de sheetPrivate, que é só visual) —
  // só quem tem permissão de ver entra no histórico devolvido.
  const messages = await prisma.chatMessage.findMany({
    where: {
      mesaId,
      OR: [
        { visibility: "public" },
        { visibility: "private", authorId: user.id },
        isGM ? { visibility: "gm" } : { visibility: "gm", authorId: user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json(messages.reverse());
}
