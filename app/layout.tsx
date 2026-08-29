import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProviderClient } from "@/components/providers/SessionProviderClient";

export const metadata: Metadata = {
  title: "Sistema Cardigan — Fichas",
  description: "Gerenciador de fichas de personagem do sistema Cardigan.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
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
