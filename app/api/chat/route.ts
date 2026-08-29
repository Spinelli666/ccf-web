import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMesaMember } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mesaId = searchParams.get("mesaId") || "";
  if (!mesaId) return NextResponse.json({ error: "mesaId é obrigatório." }, { status: 400 });

  const { user, response } = await requireMesaMember(mesaId);
  if (!user) return response;

  const take = Math.min(500, Math.max(1, Number(searchParams.get("take")) || 50));

  const messages = await prisma.chatMessage.findMany({
    where: { mesaId },
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json(messages.reverse());
}
