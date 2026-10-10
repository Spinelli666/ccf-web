import type { Metadata, Viewport } from "next";
import { Voltaire } from "next/font/google";
import "./globals.css";
import "./theme.css";
import { SessionProviderClient } from "@/components/providers/SessionProviderClient";

// Fonte única do app, servida pelo próprio Next (o @import do Google Fonts no CSS era
// descartado no build, e a página caía na sans-serif padrão).
const voltaire = Voltaire({ weight: "400", subsets: ["latin"], variable: "--font-voltaire" });

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
    <html lang="pt-BR" className={voltaire.variable}>
      <body>
        <SessionProviderClient>{children}</SessionProviderClient>
      </body>
    </html>
  );
}
