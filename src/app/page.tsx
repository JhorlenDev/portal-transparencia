import Link from "next/link"
import type { Metadata } from "next"
import { Search, DollarSign, Scale, FileText, Users, HandCoins, MessageSquare, Database, ChevronRight, TrendingUp, WalletCards, FileCheck2, CircleCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSiteConfig, getSiteStats, getLatestDespesas, getLatestReceitas, getLatestLicitacoes, getGlobalAvailableYears } from "@/lib/site-data"
import { GlobalYearSelector } from "@/components/portal/global-year-selector"

const quickLinks = [
  { title: 'Despesas', icon: DollarSign, href: '/despesas', color: '#B42318', softColor: '#FDEDEC' },
  { title: 'Receitas', icon: TrendingUp, href: '/receitas', color: '#16845D', softColor: '#E8F6F0' },
  { title: 'Licitações', icon: Scale, href: '/licitacoes', color: '#A87512', softColor: '#FFF6DE' },
  { title: 'Contratos', icon: FileText, href: '/contratos', color: '#1677B8', softColor: '#EAF5FB' },
  { title: 'Servidores', icon: Users, href: '/servidores', color: '#5B5FC7', softColor: '#F0F0FC' },
  { title: 'Convênios', icon: HandCoins, href: '/convenios', color: '#0F766E', softColor: '#E8F6F4' },
  { title: 'e-SIC', icon: MessageSquare, href: '/esic', color: '#2563A6', softColor: '#EBF2FA' },
  { title: 'Dados Abertos', icon: Database, href: '/dados-abertos', color: '#12345B', softColor: '#EAF0F6' },
]

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "Portal da Transparência de Tefé",
  description: "Consulte dados oficiais da Prefeitura Municipal de Tefé: despesas, receitas, licitações, contratos, servidores, convênios, e-SIC e dados abertos.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Portal da Transparência de Tefé",
    description: "Acesso público aos dados oficiais da Prefeitura Municipal de Tefé - AM.",
    url: "/",
  },
}

interface HomeProps { searchParams: Promise<{ ano?: string }> }

export default async function Home({ searchParams }: HomeProps) {
  const availableYears = await getGlobalAvailableYears()
  const params = await searchParams
  const anoInformado = Number(params.ano)
  const currentYear = Number.isInteger(anoInformado) && availableYears.includes(anoInformado) ? anoInformado : new Date().getFullYear()
  const [siteConfig, stats, latestDespesas, latestReceitas, latestLicitacoes] = await Promise.all([
    getSiteConfig(),
    getSiteStats(currentYear),
    getLatestDespesas(3, currentYear),
    getLatestReceitas(3, currentYear),
    getLatestLicitacoes(3, currentYear),
  ])

  const heroStats = [
    {
      label: `Receitas ${currentYear}`,
      value: formatCurrency(stats.totalReceitas),
      href: `/receitas?ano=${currentYear}`,
      icon: TrendingUp,
      iconBackground: "var(--amazon-green)",
      iconColor: "#ffffff",
      background: "linear-gradient(135deg, #ffffff 58%, #e8f6f0 100%)",
      color: "var(--amazon-green)",
      cardClass: "bg-white",
      labelClass: "text-amazon",
      valueClass: "text-amazon",
    },
    {
      label: `Despesas ${currentYear}`,
      value: formatCurrency(stats.totalDespesas),
      href: `/despesas?ano=${currentYear}`,
      icon: WalletCards,
      iconBackground: "#b42318",
      iconColor: "#ffffff",
      background: "linear-gradient(135deg, #ffffff 58%, #fdebea 100%)",
      color: "#b42318",
      cardClass: "bg-white",
      labelClass: "text-[var(--expense-red)]",
      valueClass: "text-[var(--expense-red)]",
    },
    {
      label: `Licitações ${currentYear}`,
      value: stats.totalLicitacoes.toLocaleString("pt-BR"),
      href: `/licitacoes?ano=${currentYear}`,
      icon: Scale,
      iconBackground: "var(--institutional-gold)",
      iconColor: "var(--institutional-blue)",
      background: "linear-gradient(135deg, #ffffff 58%, #fff5d9 100%)",
      color: "#9d721f",
      cardClass: "bg-white",
      labelClass: "text-amber-700",
      valueClass: "text-amber-700",
    },
    {
      label: `Contratos ativos ${currentYear}`,
      value: stats.totalContratos.toLocaleString("pt-BR"),
      href: `/contratos?ano=${currentYear}`,
      icon: FileCheck2,
      iconBackground: "var(--digital-blue)",
      iconColor: "#ffffff",
      background: "linear-gradient(135deg, #ffffff 58%, #e7f3fa 100%)",
      color: "var(--digital-blue)",
      cardClass: "bg-white",
      labelClass: "text-digital",
      valueClass: "text-digital",
    },
  ]

  return (
    <div>
      <section className="border-b-4 border-gold bg-institutional text-white">
        <div className="container mx-auto px-4 py-7 lg:py-8">
          <h1 className="sr-only">Portal da Transparência da Prefeitura Municipal de Tefé</h1>

          <div className="mb-4 flex items-end justify-between gap-3 text-left">
            <div>
              <p className="text-lg font-semibold text-white sm:text-xl">Olá, cidadão!</p>
              <p className="mt-1 text-sm text-white/65">Encontre informações públicas do município de forma rápida e transparente.</p>
            </div>
            <GlobalYearSelector years={availableYears} value={currentYear} />
          </div>

          <form action="/busca" method="GET" role="search" className="w-full">
              <div className="flex items-center gap-1.5 rounded-xl border border-gold/50 bg-white p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.20)]">
                <input type="hidden" name="ano" value={currentYear} />
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-digital" aria-hidden="true" />
                  <Input
                    type="search"
                    name="q"
                    placeholder="Buscar despesas, licitações, contratos, servidores..."
                    className="h-12 rounded-lg border-0 bg-white pl-11 text-sm text-text-primary shadow-none focus-visible:ring-0 sm:text-base"
                    aria-label="Digite o que deseja buscar no portal"
                  />
                </div>
                <Button
                  type="submit"
                  className="h-10 shrink-0 gap-2 rounded-lg bg-gold px-3 text-institutional shadow-[0_4px_12px_rgba(229,184,71,0.30)] hover:bg-amber-300 sm:h-12 sm:px-5"
                  aria-label="Realizar busca"
                >
                  <Search className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Pesquisar</span>
                </Button>
              </div>
          </form>

          <div className="mt-5 grid grid-cols-1 gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
              {heroStats.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label={`Acessar ${item.label}: ${item.value}`}
                  className={`group relative flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl p-4 shadow-[0_10px_26px_rgba(6,24,44,0.15)] outline-none transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(6,24,44,0.20)] focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-institutional ${item.cardClass}`}
                  style={{ background: item.background }}
                >
                  <span
                    className="pointer-events-none absolute -right-7 -top-8 h-20 w-20 rounded-full opacity-[0.09] transition-transform duration-300 group-hover:scale-125"
                    style={{ backgroundColor: item.iconBackground }}
                    aria-hidden="true"
                  />
                  <div
                    className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl shadow-[0_6px_14px_rgba(6,24,44,0.18)] transition-transform duration-200 group-hover:scale-105"
                    style={{ backgroundColor: item.iconBackground, color: item.iconColor }}
                    aria-hidden="true"
                  >
                    <item.icon className="h-6 w-6" strokeWidth={2.2} />
                  </div>
                  <div className="relative min-w-0">
                    <p className={`text-[11px] font-bold uppercase tracking-[0.06em] ${item.labelClass}`} style={{ color: item.color }}>{item.label}</p>
                    <p className={`mt-0.5 truncate text-xl font-extrabold tracking-[-0.03em] ${item.valueClass}`} style={{ color: item.color }}>{item.value}</p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border-subtle bg-white py-8 lg:py-10">
        <div className="container mx-auto px-4">
          <div className="mb-6 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center">
              <h2 className="text-lg font-bold text-institutional">Acesso rápido</h2>
              <p className="mt-1 text-sm text-text-secondary">Principais serviços e consultas</p>
              <span className="mt-3 h-1 w-10 rounded-full bg-gold" aria-hidden="true" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {quickLinks.map((link) => (
              <Link
                key={link.title}
                href={['/esic', '/dados-abertos'].includes(link.href) ? link.href : `${link.href}?ano=${currentYear}`}
                className="group relative flex min-h-24 flex-col items-start justify-between overflow-hidden rounded-xl border border-border-subtle bg-white p-3.5 shadow-[0_4px_14px_rgba(18,52,91,0.07)] transition-all duration-200 hover:-translate-y-0.5 hover:border-digital/40 hover:shadow-[0_10px_24px_rgba(18,52,91,0.13)]"
              >
                <span
                  className="absolute -right-5 -top-5 h-14 w-14 rounded-full opacity-70 transition-transform duration-300 group-hover:scale-150"
                  style={{ backgroundColor: link.softColor }}
                  aria-hidden="true"
                />
                <div
                  className="relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 group-hover:scale-105 group-hover:text-white"
                  style={{ backgroundColor: link.softColor, color: link.color }}
                  aria-hidden="true"
                >
                  <link.icon className="h-5 w-5" />
                </div>
                <span className="relative mt-3 text-sm font-semibold text-institutional">{link.title}</span>
                <ChevronRight
                  className="absolute bottom-3 right-3 h-4 w-4 opacity-35 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                  style={{ color: link.color }}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            <Card className="overflow-hidden border border-red-100 border-t-4 border-t-[#B42318] bg-white shadow-[0_8px_26px_rgba(18,52,91,0.08)]">
              <CardHeader className="flex flex-row items-center justify-between border-b border-red-100/70 bg-red-50/40 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100 text-[var(--expense-red)]"><WalletCards className="h-5 w-5" /></span>
                  Últimas Despesas
                </CardTitle>
                <Link href="/despesas">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-[var(--expense-red)] hover:bg-red-100" aria-label="Ver todas as últimas despesas">
                    Ver todas <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2.5">
                  {latestDespesas.length > 0 ? latestDespesas.map((despesa) => (
                    <Link key={despesa.id} href={`/despesas/${despesa.id}`} className="group block rounded-xl border border-red-100 bg-gradient-to-r from-white to-red-50/35 p-3 shadow-[0_2px_8px_rgba(180,35,24,0.05)] transition-all hover:-translate-y-0.5 hover:border-red-200 hover:shadow-[0_8px_18px_rgba(180,35,24,0.11)]">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-bold text-text-primary group-hover:text-[var(--expense-red)]">{despesa.credorNome || 'Sem credor'}</p>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--expense-red)]" />
                      </div>
                      <p className="mt-1 truncate text-xs text-text-secondary">{despesa.objeto || 'Sem objeto'}</p>
                      <p className="mt-1 truncate text-[10px] text-slate-500">{despesa.orgaoNome || 'Sem órgão'} • {despesa.numeroEmpenho}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-red-100/70 pt-2">
                        <p className="text-sm font-extrabold text-[var(--expense-red)]">{formatCurrency(despesa.valorEmpenhado || 0)}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[var(--expense-red)]"><FileCheck2 className="h-3 w-3" />{despesa.tipoMovimento}</span>
                      </div>
                    </Link>
                  )) : (
                    <p className="text-slate-600 text-center py-4">Nenhuma despesa encontrada</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-emerald-100 bg-white shadow-[0_8px_26px_rgba(18,52,91,0.08)]">
              <div className="h-1 bg-amazon" aria-hidden="true" />
              <CardHeader className="flex flex-row items-center justify-between border-b border-emerald-100/70 bg-emerald-50/40 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-amazon"><TrendingUp className="h-5 w-5" /></span>
                  Últimas Receitas
                </CardTitle>
                <Link href="/receitas">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-amazon hover:bg-emerald-100" aria-label="Ver todas as últimas receitas">
                    Ver todas <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2.5">
                  {latestReceitas.length > 0 ? latestReceitas.map((receita) => (
                    <Link key={receita.id} href={`/receitas/${receita.id}`} className="group block rounded-xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/40 p-3 shadow-[0_2px_8px_rgba(22,132,93,0.05)] transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-[0_8px_18px_rgba(22,132,93,0.11)]">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-bold text-text-primary group-hover:text-amazon">{receita.naturezaReceita || 'Sem descrição'}</p>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-amazon" />
                      </div>
                      <p className="mt-1 truncate text-[10px] text-slate-500">{receita.categoriaEconomica}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-emerald-100/70 pt-2">
                        <p className="text-sm font-extrabold text-amazon">{formatCurrency(receita.valorArrecadado || 0)}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-amazon"><TrendingUp className="h-3 w-3" />Arrecadado</span>
                      </div>
                    </Link>
                  )) : (
                    <p className="text-slate-600 text-center py-4">Nenhuma receita encontrada</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border border-blue-100 bg-white shadow-[0_8px_26px_rgba(18,52,91,0.08)] md:col-span-2 xl:col-span-1">
              <div className="h-1 bg-digital" aria-hidden="true" />
              <CardHeader className="flex flex-row items-center justify-between border-b border-blue-100/70 bg-blue-50/40 pb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-digital"><Scale className="h-5 w-5" /></span>
                  Últimas Licitações
                </CardTitle>
                <Link href="/licitacoes">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs text-digital hover:bg-blue-100" aria-label="Ver todas as últimas licitações">
                    Ver todas <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2.5">
                  {latestLicitacoes.length > 0 ? latestLicitacoes.map((licitacao) => (
                    <Link key={licitacao.id} href={`/licitacoes/${licitacao.id}`} className="group block rounded-xl border border-blue-100 bg-gradient-to-r from-white to-blue-50/45 p-3 shadow-[0_2px_8px_rgba(22,119,184,0.05)] transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_18px_rgba(22,119,184,0.11)]">
                      <div className="flex items-start justify-between gap-3">
                        <p className="truncate text-sm font-bold text-text-primary group-hover:text-digital">{licitacao.objeto || 'Sem objeto'}</p>
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-digital" />
                      </div>
                      <p className="mt-1 truncate text-[10px] text-slate-500">{licitacao.modalidade} • N° {licitacao.numero}/{licitacao.ano}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-blue-100/70 pt-2">
                        <p className="text-sm font-extrabold text-digital">{formatCurrency(licitacao.valorEstimado || 0)}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100/70 px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-digital"><CircleCheck className="h-3 w-3" />{licitacao.status}</span>
                      </div>
                    </Link>
                  )) : (
                    <p className="text-slate-600 text-center py-4">Nenhuma licitação encontrada</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:col-span-2 md:grid-cols-2 xl:col-span-3 xl:grid-cols-3">
              <Card className="group overflow-hidden border-0 bg-institutional text-white shadow-[0_12px_30px_rgba(18,52,91,0.18)]">
                <CardContent className="relative flex h-full flex-col p-6">
                  <span className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-digital/25 transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-gold" aria-hidden="true">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-5 text-lg font-bold">Acesso à Informação</h3>
                  <p className="relative mt-1.5 text-sm leading-5 text-white/70">Solicite documentos e informações públicas pelo e-SIC.</p>
                  <Link href="/esic" className="relative mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-institutional shadow-sm transition hover:bg-gold">
                    Fazer pedido (LAI) <ChevronRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border border-amber-100 bg-white shadow-[0_10px_28px_rgba(18,52,91,0.09)]">
                <CardHeader className="border-b border-amber-100 bg-amber-50/60 pb-4">
                  <CardTitle className="flex items-center gap-3 text-lg font-bold text-institutional">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><FileText className="h-5 w-5" /></span>
                    Links Úteis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5 p-4">
                  {(siteConfig.link_pncp || 'https://pncp.gov.br') && (
                    <a
                      href={siteConfig.link_pncp || 'https://pncp.gov.br'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-xl border border-border-subtle bg-white p-3 text-sm font-medium text-text-primary transition-all hover:border-amber-200 hover:bg-amber-50"
                      aria-label="Portal Nacional de Contratações (abre em nova aba)"
                    >
                      <span>Portal Nacional de Contratações</span>
                      <svg className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                  {(siteConfig.link_fala_br || 'https://falabr.cgu.gov.br') && (
                    <a
                      href={siteConfig.link_fala_br || 'https://falabr.cgu.gov.br'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center justify-between rounded-xl border border-border-subtle bg-white p-3 text-sm font-medium text-text-primary transition-all hover:border-amber-200 hover:bg-amber-50"
                      aria-label="Fala.BR da CGU (abre em nova aba)"
                    >
                      <span>Fala.BR (CGU)</span>
                      <svg className="h-4 w-4 text-slate-400 transition-colors group-hover:text-amber-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </a>
                  )}
                </CardContent>
              </Card>

              <Card className="group overflow-hidden border-0 bg-amazon text-white shadow-[0_12px_30px_rgba(22,132,93,0.18)] md:col-span-2 xl:col-span-1">
                <CardContent className="relative flex h-full flex-col p-6">
                  <span className="absolute -bottom-14 -right-10 h-40 w-40 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-125" aria-hidden="true" />
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white" aria-hidden="true">
                    <Database className="h-5 w-5" />
                  </div>
                  <h3 className="relative mt-5 text-lg font-bold">Dados Abertos</h3>
                  <p className="relative mt-1.5 text-sm leading-5 text-white/75">Consulte e baixe dados públicos em CSV e JSON.</p>
                  <Link href="/dados-abertos" className="relative mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-white px-4 text-sm font-bold text-amazon shadow-sm transition hover:bg-gold hover:text-institutional">
                    Acessar catálogo <ChevronRight className="h-4 w-4" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
