import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import { ChevronRight, FileCheck2, Files, Search, SearchX, TrendingUp, UserRound, WalletCards } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { getGlobalSearch } from "@/lib/site-data"

interface BuscaProps { searchParams: Promise<{ q?: string }> }
interface Resultado { id: string; titulo: string; descricao?: string | null; detalhe?: string | null; href: string }

function GrupoResultados({ titulo, resultados, icone: Icone, cor, fundo }: { titulo: string; resultados: Resultado[]; icone: LucideIcon; cor: string; fundo: string }) {
  if (!resultados.length) return null
  return <section className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-[0_6px_20px_rgba(18,52,91,0.07)] transition-shadow hover:shadow-[0_10px_28px_rgba(18,52,91,0.11)]" style={{ borderTop: `3px solid ${cor}` }}>
    <header className="flex items-center justify-between border-b border-border-subtle px-3.5 py-2.5" style={{ background: `linear-gradient(90deg, ${fundo} 0%, #ffffff 45%)` }}><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm" style={{ backgroundColor: fundo, color: cor }}><Icone className="h-4 w-4" aria-hidden="true" /></span><h2 className="text-sm font-bold text-institutional">{titulo}</h2></div><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: fundo, color: cor }}>{resultados.length}</span></header>
    <div className="divide-y divide-slate-100">{resultados.map((resultado) => <Link key={resultado.id} href={resultado.href} className="group flex min-w-0 items-center gap-3 px-3.5 py-2.5 transition-all hover:bg-slate-50/80"><span className="h-7 w-1 shrink-0 rounded-full opacity-70 transition-all group-hover:h-8 group-hover:opacity-100" style={{ backgroundColor: cor }} aria-hidden="true" /><div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><h3 className="truncate text-[13px] font-bold text-text-primary transition-colors group-hover:text-digital">{resultado.titulo}</h3>{resultado.detalhe && <span className="max-w-36 shrink-0 truncate rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-slate-500">{resultado.detalhe}</span>}</div>{resultado.descricao && <p className="mt-0.5 truncate text-[11px] text-text-secondary">{resultado.descricao}</p>}</div><ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-1" style={{ color: cor }} aria-hidden="true" /></Link>)}</div>
  </section>
}

export async function generateMetadata({ searchParams }: BuscaProps): Promise<Metadata> {
  const query = (await searchParams).q?.trim()
  return { title: query ? `Busca por ${query}` : "Busca no Portal da Transparência", description: query ? `Resultados de busca por ${query} no Portal da Transparência de Tefé.` : "Busque dados públicos no Portal da Transparência de Tefé.", robots: { index: false, follow: true } }
}

export default async function Busca({ searchParams }: BuscaProps) {
  const query = (await searchParams).q?.trim() || ""
  const results = await getGlobalSearch(query)
  const total = Object.values(results).reduce((soma, itens) => soma + itens.length, 0)
  const grupos = [
    { titulo: "Despesas", icone: WalletCards, cor: "#B42318", fundo: "#FDEDEC", resultados: results.despesas.map((item) => ({ id: item.id, titulo: item.credorNome || "Credor não informado", descricao: item.objeto, detalhe: `Empenho ${item.numeroEmpenho}`, href: `/despesas/${item.id}` })) },
    { titulo: "Receitas", icone: TrendingUp, cor: "#16845D", fundo: "#E8F6F0", resultados: results.receitas.map((item) => ({ id: item.id, titulo: item.naturezaReceita, descricao: item.categoriaEconomica, detalhe: item.codigoNatureza, href: `/receitas/${item.id}` })) },
    { titulo: "Licitações", icone: FileCheck2, cor: "#A87512", fundo: "#FFF6DE", resultados: results.licitacoes.map((item) => ({ id: item.id, titulo: `Processo ${item.numero.includes("/") ? item.numero : `${item.numero}/${item.ano}`}`, descricao: item.objeto, detalhe: item.modalidade, href: `/licitacoes/${item.id}` })) },
    { titulo: "Contratos", icone: Files, cor: "#1677B8", fundo: "#EAF5FB", resultados: results.contratos.map((item) => ({ id: item.id, titulo: item.contratadoNome, descricao: item.objeto, detalhe: `Contrato ${item.numero}`, href: `/contratos/${item.id}` })) },
    { titulo: "Servidores", icone: UserRound, cor: "#5B5FC7", fundo: "#F0F0FC", resultados: results.servidores.map((item) => ({ id: item.id, titulo: item.nome, descricao: [item.cargo, item.lotacao].filter(Boolean).join(" · "), detalhe: item.matricula, href: `/servidores/${item.id}` })) },
  ]
  return <div className="container mx-auto px-4 py-6">
    <Breadcrumbs items={[{ label: "Busca" }]} />
    <section className="mb-5 rounded-xl border border-border-subtle border-t-[3px] border-t-digital bg-white p-4 shadow-[0_8px_24px_rgba(18,52,91,0.08)]"><div className="mb-3 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-digital shadow-sm"><Search className="h-5 w-5" /></span><div><h1 className="text-base font-extrabold text-institutional">Busca no Portal</h1><p className="text-xs text-text-secondary">Consulte registros em todas as áreas da transparência</p></div></div><form action="/busca" method="GET"><div className="relative rounded-xl border border-border-subtle bg-white p-1 shadow-inner"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-digital" aria-hidden="true" /><Input name="q" defaultValue={query} type="search" placeholder="Buscar despesas, receitas, licitações, contratos ou servidores..." className="h-11 border-0 bg-transparent pl-10 pr-12 shadow-none focus-visible:ring-0 sm:pr-28" /><Button type="submit" aria-label="Buscar no portal" className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 gap-1.5 bg-gold px-3 text-institutional shadow-sm hover:bg-amber-300 sm:px-4"><Search className="h-4 w-4" /><span className="hidden sm:inline">Buscar</span></Button></div></form></section>
    {query ? total > 0 ? <><div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm text-text-secondary">Resultados para <strong className="text-institutional">“{query}”</strong></p><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-digital">{total} encontrado{total === 1 ? "" : "s"}</span></div><div className="grid items-start gap-4 lg:grid-cols-2">{grupos.map((grupo) => <GrupoResultados key={grupo.titulo} {...grupo} />)}</div></> : <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center"><SearchX className="mx-auto h-9 w-9 text-slate-300" /><h2 className="mt-3 font-bold text-institutional">Nenhum resultado encontrado</h2><p className="mt-1 text-sm text-text-secondary">Tente outro nome, número, documento ou termo.</p></div> : <div className="rounded-xl border border-dashed border-slate-300 bg-white py-10 text-center"><Search className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-sm text-text-secondary">Digite um termo para pesquisar no portal.</p></div>}
  </div>
}
