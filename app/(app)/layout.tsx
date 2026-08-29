import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TableChat } from "@/components/chat/TableChat";
import { TopBar } from "@/components/nav/TopBar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="page">
      <div className="layout">
        <div className="main-col">
          <TopBar displayName={session.user.name ?? session.user.username} />
          {children}
        </div>
        <aside className="sidebar">
          <TableChat />
        </aside>
      </div>
    </div>
  );
}
