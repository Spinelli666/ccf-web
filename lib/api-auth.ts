import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    return { user: null, response: NextResponse.json({ error: "Não autenticado." }, { status: 401 }) };
  }
  return { user: session.user, response: null };
}
