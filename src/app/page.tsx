import { Suspense } from "react"
import Link from "next/link"
import { Search, DollarSign, Scale, FileText, Users, HandCoins, MessageSquare, Database, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getSiteConfig, getSiteStats, getLatestDespesas } from "@/lib/site-data"

const quickLinks = [
  { title: 'Despesas', icon: DollarSign, href: '/despesas', color: 'emerald', description: 'Empenhos, liquidações e pagamentos' },
  { title: 'Receitas', icon: DollarSign, href: '/receitas', color: 'blue', description: 'Arrecadação e previsão' },
  { title: 'Licitações', icon: Scale, href: '/licitacoes', color: 'purple', description: 'Processos licitatórios' },
  { title: 'Contratos', icon: FileText, href: '/contratos', color: 'amber', description: 'Contratos administrativos' },
  { title: 'Servidores', icon: Users, href: '/servidores', color: 'rose', description: 'Quadro de pessoal e remuneração' },
  { title: 'Convênios', icon: HandCoins, href: '/convenios', color: 'cyan', description: 'Convênios e transferências' },
  { title: 'e-SIC', icon: MessageSquare, href: '/esic', color: 'teal', description: 'Pedidos de informação' },
  { title: 'Dados Abertos', icon: Database, href: '/dados-abertos', color: 'indigo', description: 'Downloads e API' },
]

const colorClasses: Record<string, string> = {
  emerald: 'from-emerald-500 to-emerald-600',
  blue: 'from-blue-500 to-blue-600',
  purple: 'from-purple-500 to-purple-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  cyan: 'from-cyan-500 to-cyan-600',
  teal: 'from-teal-500 to-teal-600',
  indigo: 'from-indigo-500 to-indigo-600',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const dynamic = 'force-dynamic'

function HomeStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
      <div className="bg-white/10 backdrop-blur rounded-xl p-4">
        <Skeleton className="h-3 w-24 mb-2 bg-white/20" />
        <Skeleton className="h-6 w-32 bg-white/20" />
      </div>
      <div className="bg-white/10 backdrop-blur rounded-xl p-4">
        <Skeleton className="h-3 w-24 mb-2 bg-white/20" />
        <Skeleton className="h-6 w-32 bg-white/20" />
      </div>
      <div className="bg-white/10 backdrop-blur rounded-xl p-4">
        <Skeleton className="h-3 w-24 mb-2 bg-white/20" />
        <Skeleton className="h-6 w-20 bg-white/20" />
      </div>
      <div className="bg-white/10 backdrop-blur rounded-xl p-4">
        <Skeleton className="h-3 w-24 mb-2 bg-white/20" />
        <Skeleton className="h-6 w-20 bg-white/20" />
      </div>
    </div>
  )
}

async function HomeContent() {
  const [siteConfig, stats, latestDespesas] = await Promise.all([
    getSiteConfig(),
    getSiteStats(),
    getLatestDespesas(3)
  ])

  const currentYear = new Date().getFullYear()

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-emerald-200 text-xs mb-1">Receitas {currentYear}</p>
          <p className="text-xl font-bold">{formatCurrency(stats.totalReceitas)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-emerald-200 text-xs mb-1">Despesas {currentYear}</p>
          <p className="text-xl font-bold">{formatCurrency(stats.totalDespesas)}</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-emerald-200 text-xs mb-1">Licitações {currentYear}</p>
          <p className="text-xl font-bold">{stats.totalLicitacoes}</p>
        </div>
        <div className="bg-white/10 backdrop-blur rounded-xl p-4">
          <p className="text-emerald-200 text-xs mb-1">Contratos Ativos</p>
          <p className="text-xl font-bold">{stats.totalContratos}</p>
        </div>
      </div>

      <section className="py-12 bg-white border-b">
        <div className="container mx-auto px-4">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Acesso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={link.href}
                className="group flex flex-col items-center p-6 bg-slate-50 rounded-xl hover:bg-emerald-50 hover:shadow-md transition-all duration-300"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses[link.color]} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                  <link.icon className="h-7 w-7 text-white" />
                </div>
                <span className="font-medium text-slate-800 text-center">{link.title}</span>
                <span className="text-xs text-slate-500 text-center mt-1">{link.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Últimas Despesas
                </CardTitle>
                <Link href="/despesas">
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ver todas <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {latestDespesas.length > 0 ? latestDespesas.map((despesa) => (
                    <div key={despesa.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 truncate">{despesa.credorNome || 'Sem credor'}</p>
                        <p className="text-sm text-slate-500 truncate">{despesa.objeto || 'Sem objeto'}</p>
                        <p className="text-xs text-slate-400 mt-1">{despesa.orgaoNome || 'Sem órgão'} • {despesa.numeroEmpenho}</p>
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-emerald-600">{formatCurrency(despesa.valorEmpenhado || 0)}</p>
                        <span className="text-xs text-slate-500">{despesa.tipoMovimento}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-slate-500 text-center py-4">Nenhuma despesa encontrada</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Acesso à Informação</h3>
                      <p className="text-emerald-100 text-sm mb-4">
                        Solicite informações públicas através do e-SIC.
                      </p>
                      <Link href="/esic">
                        <Button variant="secondary" size="sm" className="w-full justify-start gap-2">
                          <FileText className="h-4 w-4" />
                          Fazer Pedido (LAI)
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">Links Úteis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {siteConfig.linkPncp && (
                    <a
                      href={siteConfig.linkPncp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
                    >
                      <span>Portal Nacional de Contratações</span>
                      <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                  {siteConfig.linkFalaBr && (
                    <a
                      href={siteConfig.linkFalaBr}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors text-sm"
                    >
                      <span>Fala.BR (CGU)</span>
                      <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-slate-800 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Database className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold">Dados Abertos</h3>
                <p className="text-slate-400">Baixe dados em formatos abertos (CSV, JSON).</p>
              </div>
            </div>
            <Link href="/dados-abertos">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 gap-2">
                <Database className="h-5 w-5" />
                Acessar Catálogo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}

export default async function Home() {
  const [siteConfig] = await Promise.all([getSiteConfig()])

  return (
    <div>
      <section className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 text-white">
        <div className="container mx-auto px-4 py-12 lg:py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              {siteConfig.nomeSite}
            </h1>
            <p className="text-lg text-emerald-100 mb-8 max-w-2xl mx-auto">
              {siteConfig.descricao || "Acesso à informação pública municipal. Transparência é um direito de todos os cidadãos."}
            </p>
            
            <form action="/busca" method="GET" className="max-w-xl mx-auto">
              <div className="relative">
                <Input
                  type="search"
                  name="q"
                  placeholder="Buscar despesas, licitações, contratos, servidores..."
                  className="h-14 pl-5 pr-14 text-slate-800 bg-white/95 backdrop-blur border-0 shadow-xl text-base rounded-xl"
                />
                <Button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </form>

            <Suspense fallback={<HomeStatsSkeleton />}>
              <HomeContent />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  )
}
