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
    title: {
      default: config.nomeSite || 'Portal da Transparência',
      template: `%s | ${config.nomeSite || 'Portal da Transparência'}`,
    },
    description: config.descricao || "Portal de Transparência Pública. Acesso direto e claro aos dados do município.",
    authors: [{ name: "Prefeitura Municipal" }],
    creator: "Prefeitura Municipal",
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://portal-transparencia-360.vercel.app",
      title: config.nomeSite || 'Portal da Transparência',
      description: config.descricao || "Acesse informações públicas em formato aberto (CSV, JSON) e consuma nossa API REST nativa.",
      siteName: config.nomeSite || 'Portal da Transparência',
    },
    twitter: {
      card: "summary_large_image",
      title: config.nomeSite || 'Portal da Transparência',
      description: config.descricao || "Acesso aos dados do município.",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = await getSiteConfig()

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50`}>
        <Header config={config} />
        <main className="flex-1" id="conteudo">
          {children}
        </main>
        <Footer config={config} />
      </body>
    </html>
  );
}
