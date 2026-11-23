"use client"

import Link from "next/link"
import Image from "next/image"
import { ChevronRight, Clock, ExternalLink, Mail, MapPin, Phone, ShieldCheck } from "lucide-react"

export default function Footer({ config }: { config?: Record<string, string | null> }) {
  const currentYear = new Date().getFullYear()

  const safeConfig = config || {}

  const descricao = safeConfig.descricao || 'Portal de transparência pública da Prefeitura Municipal.'
  const endereco = safeConfig.endereco || 'Rua Olavo Bilac, S/N - Centro\nTefé - AM, CEP 69470-000'
  const telefone = safeConfig.telefone_contato || '(97) 3343-2527'
  const email = safeConfig.email_contato || 'transparencia@prefeitura.gov.br'
  const horario = safeConfig.horario_funcionamento || 'Seg. a Sex., 08h às 14h'
  const linkFalaBr = safeConfig.link_fala_br || 'https://falabr.cgu.gov.br'
  const linkPncp = safeConfig.link_pncp || 'https://pncp.gov.br'
  const linkSiteOficial = safeConfig.link_site_oficial || 'https://www.gov.br'
  const textoRodape = (safeConfig.texto_rodape || '© {ano} Prefeitura Municipal. Todos os direitos reservados.').replace('{ano}', String(currentYear))
  const acessos = [
    ["Despesas", "/despesas"], ["Receitas", "/receitas"], ["Licitações", "/licitacoes"],
    ["Contratos", "/contratos"], ["Servidores", "/servidores"], ["e-SIC", "/esic"],
  ]
  const linksExternos = [
    ["Site Oficial", linkSiteOficial], ["Fala.BR", linkFalaBr], ["PNCP", linkPncp],
  ]

  return (
    <footer className="border-t-4 border-t-gold bg-institutional text-white">
      <div className="container mx-auto px-4 py-10 lg:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-[1.15fr_0.9fr_1.25fr] lg:gap-12">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-2 shadow-lg">
              <Image
                src="/logo-portal-transparencia.png"
                alt="Logotipo do Portal da Transparência de Tefé"
                width={784}
                height={803}
                className="h-11 w-auto object-contain"
              />
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">Portal da Transparência</p>
                <p className="mt-0.5 text-xs text-white/60">Prefeitura Municipal de Tefé</p>
              </div>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-white/65">
              {descricao}
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs text-white/75">
              <ShieldCheck className="h-4 w-4 text-gold" aria-hidden="true" />
              Informação pública, simples e acessível
            </div>
          </div>

          <div>
            <h4 className="mb-4 flex items-center gap-2 font-semibold text-white"><span className="h-4 w-1 rounded-full bg-gold" />Acesso rápido</h4>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
              {acessos.map(([titulo, href]) => <li key={href}>
                <Link href={href} className="group flex items-center gap-1 text-white/65 transition-colors hover:text-white">
                  <ChevronRight className="h-3.5 w-3.5 text-gold/70 transition-transform group-hover:translate-x-0.5" />{titulo}
                </Link>
              </li>)}
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              {linksExternos.map(([titulo, href]) => <a key={titulo} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
                {titulo}<ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>)}
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <h4 className="mb-4 flex items-center gap-2 font-semibold text-white"><span className="h-4 w-1 rounded-full bg-gold" />Contato</h4>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><span className="whitespace-pre-line text-sm leading-5 text-white/70">{endereco}</span></div>
              <a href={`tel:${telefone.replace(/\D/g, '')}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"><Phone className="h-4 w-4 shrink-0 text-gold" />{telefone}</a>
              <a href={`mailto:${email}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"><Mail className="h-4 w-4 shrink-0 text-gold" /><span className="truncate">{email}</span></a>
              <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.05] p-3 text-sm text-white/70"><Clock className="h-4 w-4 shrink-0 text-gold" />{horario}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-black/10">
        <div className="container mx-auto px-4 py-4">
          <div className="grid items-center gap-3 text-center text-xs text-white/55 md:grid-cols-3 md:text-left">
            <p className="md:justify-self-start">
              {textoRodape}
            </p>
            <p className="font-medium text-white/70 md:justify-self-center">
              Desenvolvido por{" "}
              <a
                href="https://www.instagram.com/sedecti_tefe/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-gold transition hover:text-white hover:underline"
              >
                SEDECTI - Tefé
              </a>
            </p>
            <div className="flex items-center justify-center gap-4 md:justify-self-end">
              <Link href="/privacidade" className="transition hover:text-white">
                Política de Privacidade
              </Link>
              <Link href="/acessibilidade" className="transition hover:text-white">
                Acessibilidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
