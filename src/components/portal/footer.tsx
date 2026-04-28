"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react"

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

  return (
    <footer className="bg-slate-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="mb-4 bg-white p-2 rounded-xl w-fit">
              <Image
                src="/logo.webp"
                alt="Logotipo do Portal da Transparência de Tefé"
                width={200}
                height={48}
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {descricao}
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-emerald-400">Acesso Rápido</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/despesas" className="text-slate-300 hover:text-white transition-colors">
                  Despesas Públicas
                </Link>
              </li>
              <li>
                <Link href="/receitas" className="text-slate-300 hover:text-white transition-colors">
                  Receitas
                </Link>
              </li>
              <li>
                <Link href="/licitacoes" className="text-slate-300 hover:text-white transition-colors">
                  Licitações
                </Link>
              </li>
              <li>
                <Link href="/contratos" className="text-slate-300 hover:text-white transition-colors">
                  Contratos
                </Link>
              </li>
              <li>
                <Link href="/servidores" className="text-slate-300 hover:text-white transition-colors">
                  Servidores
                </Link>
              </li>
              <li>
                <Link href="/esic" className="text-slate-300 hover:text-white transition-colors">
                  e-SIC
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-emerald-400">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
                <span className="text-slate-300 whitespace-pre-line">{endereco}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <span className="text-slate-300">{telefone}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <a href={`mailto:${email}`} className="text-slate-300 hover:text-white" aria-label={`Enviar e-mail para ${email}`}>
                  {email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                <span className="text-slate-300">{horario}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-emerald-400">Links Úteis</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href={linkSiteOficial} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  aria-label="Site Oficial (abre em nova aba)"
                >
                  Site Oficial <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a 
                  href={linkFalaBr} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  aria-label="Fala.BR Ouvidoria (abre em nova aba)"
                >
                  Fala.BR (Ouvidoria) <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
              <li>
                <a 
                  href={linkPncp} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                  aria-label="Portal Nacional de Contratações (abre em nova aba)"
                >
                  PNCP <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-300">
            <p>
              {textoRodape}
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacidade" className="hover:text-white">
                Política de Privacidade
              </Link>
              <Link href="/acessibilidade" className="hover:text-white">
                Acessibilidade
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
