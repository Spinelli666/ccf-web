import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";

export async function GET(req: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { searchParams } = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(searchParams.get("take")) || 50));

  const messages = await prisma.chatMessage.findMany({
    orderBy: { createdAt: "desc" },
    take,
  });
  return NextResponse.json(messages.reverse());
}
