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
      default: config.nomeSite || 'Portal da Transparência de Tefé',
      template: `%s | ${config.nomeSite || 'Portal da Transparência de Tefé'}`,
    },
    description: config.descricao || "Portal de Transparência Pública da Prefeitura de Tefé - AM. Acesso direto, claro e atualizado aos dados e contas do município.",
    authors: [{ name: "Prefeitura Municipal de Tefé" }],
    creator: "Prefeitura Municipal de Tefé",
    keywords: ["Tefé", "Transparência", "Prefeitura de Tefé", "Contas Públicas", "AM", "Amazonas", "Licitações", "Portal da Transparência"],
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: process.env.NEXT_PUBLIC_APP_URL || "https://portal-transparencia-360.vercel.app",
      title: config.nomeSite || 'Portal da Transparência de Tefé',
      description: config.descricao || "Acesse informações públicas da Prefeitura de Tefé em formato aberto e consuma nossa API REST nativa.",
      siteName: config.nomeSite || 'Portal da Transparência de Tefé',
      images: [
        {
          url: "/logo.webp",
          width: 800,
          height: 600,
          alt: "Logo Portal da Transparência de Tefé",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: config.nomeSite || 'Portal da Transparência de Tefé',
      description: config.descricao || "Acesso às contas públicas de Tefé - AM.",
      images: ["/logo.webp"],
    },
    icons: {
      icon: "/favicon.webp",
      shortcut: "/favicon.webp",
      apple: "/favicon.webp",
    },
    manifest: "/manifest.json",
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
