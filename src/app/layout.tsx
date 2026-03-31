import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/portal/header";
import Footer from "@/components/portal/footer";
import { getSiteConfig } from "@/lib/site-data";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  return {
    title: config.nomeSite,
    description: config.descricao || "Portal de Transparência Pública",
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50`}>
        <Header />
        <main className="flex-1" id="conteudo">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
