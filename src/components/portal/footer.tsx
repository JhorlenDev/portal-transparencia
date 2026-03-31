import Link from "next/link"
import { MapPin, Phone, Mail, Clock, ExternalLink } from "lucide-react"

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-slate-800 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">PT</span>
              </div>
              <div>
                <h3 className="font-bold">Portal da Transparência</h3>
                <p className="text-xs text-slate-400">Prefeitura Municipal</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Portal de transparência pública da Prefeitura Municipal. 
              Acesso a informações públicas conforme Lei de Acesso à Informação (Lei 12.527/2011).
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-emerald-400">Acesso Rápido</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/despesas" className="text-slate-400 hover:text-white transition-colors">
                  Despesas Públicas
                </Link>
              </li>
              <li>
                <Link href="/receitas" className="text-slate-400 hover:text-white transition-colors">
                  Receitas
                </Link>
              </li>
              <li>
                <Link href="/licitacoes" className="text-slate-400 hover:text-white transition-colors">
                  Licitações
                </Link>
              </li>
              <li>
                <Link href="/contratos" className="text-slate-400 hover:text-white transition-colors">
                  Contratos
                </Link>
              </li>
              <li>
                <Link href="/servidores" className="text-slate-400 hover:text-white transition-colors">
                  Servidores
                </Link>
              </li>
              <li>
                <Link href="/esic" className="text-slate-400 hover:text-white transition-colors">
                  e-SIC
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-emerald-400">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-500 flex-shrink-0" />
                <span className="text-slate-400">
                  Rua Olavo Bilac, S/N - Centro<br />
                  Tefé - AM, CEP 69470-000
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span className="text-slate-400">(97) 3343-2527</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-emerald-500" />
                <a href="mailto:transparencia@prefeitura.gov.br" className="text-slate-400 hover:text-white">
                  transparencia@prefeitura.gov.br
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span className="text-slate-400">Seg. a Sex., 08h às 14h</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-emerald-400">Links Úteis</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a 
                  href="https://www.gov.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Site Oficial <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://falabr.cgu.gov.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  Fala.BR (Ouvidoria) <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a 
                  href="https://pncp.gov.br" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  PNCP <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>
              © {currentYear} Prefeitura Municipal. Todos os direitos reservados.
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
