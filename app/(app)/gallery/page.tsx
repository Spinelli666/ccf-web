import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GalleryClient } from "@/components/gallery/GalleryClient";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const session = await auth();
  const sheets = await prisma.sheet.findMany({
    where: { OR: [{ private: false }, { ownerId: session!.user.id }] },
    include: { owner: { select: { displayName: true, username: true } } },
    orderBy: { name: "asc" },
  });

  return <GalleryClient sheets={JSON.parse(JSON.stringify(sheets))} currentUserId={session!.user.id} />;
}
