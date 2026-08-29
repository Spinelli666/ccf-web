import type { Metadata } from "next";
import "./globals.css";
import { SessionProviderClient } from "@/components/providers/SessionProviderClient";

export const metadata: Metadata = {
  title: "Sistema Cardigan — Fichas",
  description: "Gerenciador de fichas de personagem do sistema Cardigan.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <SessionProviderClient>{children}</SessionProviderClient>
      </body>
    </html>
  );
}
