import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/portal/header";
import Footer from "@/components/portal/footer";
import { StructuredData } from "@/components/portal/structured-data";
import { getSiteConfig } from "@/lib/site-data";

const inter = Inter({ subsets: ["latin"] });

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const config = await getSiteConfig()
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.tefe.am.gov.br"
  const siteName = config.nome_site || config.nomeSite || "Portal da Transparência de Tefé"
  const description = config.descricao || "Portal de Transparência Pública da Prefeitura Municipal de Tefé - AM. Consulte despesas, receitas, licitações, contratos, servidores, convênios e dados abertos oficiais."
  
  return {
    metadataBase: new URL(baseUrl),
    applicationName: siteName,
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description,
    authors: [{ name: "Prefeitura Municipal de Tefé" }],
    creator: "Prefeitura Municipal de Tefé",
    publisher: "Prefeitura Municipal de Tefé",
    category: "government",
    classification: "Portal de Transparência Pública Municipal",
    keywords: [
      "Portal da Transparência de Tefé",
      "Transparência Tefé",
      "Prefeitura de Tefé",
      "Prefeitura Municipal de Tefé",
      "Tefé AM",
      "Amazonas",
      "Contas públicas Tefé",
      "Despesas públicas Tefé",
      "Receitas públicas Tefé",
      "Licitações Tefé",
      "Contratos Tefé",
      "Servidores públicos Tefé",
      "Dados abertos Tefé",
      "Lei de Acesso à Informação Tefé",
    ],
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      url: baseUrl,
      title: siteName,
      description,
      siteName,
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
      title: siteName,
      description,
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
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://transparencia.tefe.am.gov.br"
  const siteName = config.nome_site || config.nomeSite || "Portal da Transparência de Tefé"

  return (
    <html lang="pt-BR">
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50`}>
        <StructuredData
          type="website"
          data={{
            name: siteName,
            url: baseUrl,
            description: config.descricao || "Portal oficial de transparência pública da Prefeitura Municipal de Tefé.",
            searchUrl: `${baseUrl}/busca`,
          }}
        />
        <StructuredData
          type="organization"
          data={{
            name: "Prefeitura Municipal de Tefé",
            description: "Portal oficial de transparência pública da Prefeitura Municipal de Tefé, Amazonas.",
            url: baseUrl,
            logo: `${baseUrl}/logo.webp`,
            contactPoint: {
              telephone: config.telefone_contato || "",
              email: config.email_contato || "",
            },
            address: {
              addressLocality: "Tefé",
              addressRegion: "AM",
              streetAddress: config.endereco || "Tefé, Amazonas",
            },
          }}
        />
        <Header config={config} />
        <main className="flex-1" id="conteudo">
          {children}
        </main>
        <Footer config={config} />
      </body>
    </html>
  );
}
