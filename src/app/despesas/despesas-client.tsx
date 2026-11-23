"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpDown, BadgeDollarSign, Banknote, Building2, ChevronRight, CircleDollarSign, ClipboardList, FileText, Landmark, UserRound } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PaginationControls } from "@/components/portal/pagination-controls"
import { ExecutionIndicators } from "@/components/portal/execution-indicators"
import type { PaginationMeta } from "@/lib/site-data"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0)
}

interface Attachment { id: string; nomeArquivo: string; urlArquivo: string; tamanho: number | null; tipoMime: string | null }
interface DespesaWithAnexos {
  id: string; numeroEmpenho: string; dataEmpenho: Date | string | null; credorNome: string | null; credorCpfCnpj: string | null
  objeto: string | null; orgaoNome: string | null; unidadeNome?: string | null; tipoMovimento?: string | null
  valorEmpenhado: number | null; valorLiquidado: number | null; valorPago: number | null; anexos: Attachment[]
}
interface Stats { empenhado: number; liquidado: number; pago: number }
type FaseDespesa = 'empenhado' | 'liquidado' | 'pago' | 'a_liquidar' | 'liquidado_a_pagar'
interface DespesasContentProps { despesas: DespesaWithAnexos[]; stats: Stats; currentYear: number; activePhase?: FaseDespesa; pagination?: PaginationMeta }

const data = (valor: Date | string | null) => valor ? new Date(valor).toLocaleDateString("pt-BR", { timeZone: "America/Manaus" }) : "—"

function DespesasTable({ despesas, currentYear }: { despesas: DespesaWithAnexos[]; currentYear: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const ordenarPor = (campo: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const mesma = params.get("ordenar") === campo
    params.set("ordenar", campo)
    params.set("ordem", mesma && params.get("ordem") !== "asc" ? "asc" : "desc")
    params.delete("page")
    return `${pathname}?${params.toString()}`
  }
  const icone = (campo: string) => searchParams.get("ordenar") !== campo ? <ArrowUpDown className="h-3.5 w-3.5 opacity-45" /> : searchParams.get("ordem") === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-gold" /> : <ArrowDown className="h-3.5 w-3.5 text-gold" />
  const th = (rotulo: string, campo: string, Icone: typeof ClipboardList) => <Link href={ordenarPor(campo)} className="inline-flex items-center gap-1.5 rounded px-1 py-1 transition hover:bg-white/10"><Icone className="h-3.5 w-3.5 text-gold" aria-hidden="true" />{rotulo}{icone(campo)}</Link>
  const titulo = (rotulo: string, Icone: typeof ClipboardList) => <span className="inline-flex items-center gap-1.5 px-1 py-1"><Icone className="h-3.5 w-3.5 text-gold" aria-hidden="true" />{rotulo}</span>

  return <>
    <div className="space-y-3 md:hidden">
      {despesas.length ? despesas.map((despesa) => <Link key={despesa.id} href={`/despesas/${despesa.id}`} className="group block rounded-2xl border border-red-100 bg-white p-4 shadow-[0_5px_18px_rgba(18,52,91,0.07)]">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[10px] font-semibold text-digital">Empenho {despesa.numeroEmpenho}</span><span className="ml-2 text-[10px] text-slate-500">{data(despesa.dataEmpenho)}</span><h3 className="mt-2 truncate text-sm font-bold text-institutional">{despesa.credorNome || "Credor não informado"}</h3></div><ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-digital" /></div>
        <p className="mt-1 truncate text-xs text-text-secondary">{despesa.objeto || "Sem objeto informado"}</p>
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-left"><div><p className="text-[9px] uppercase text-slate-500">Empenhado</p><p className="text-xs font-bold text-institutional">{formatCurrency(despesa.valorEmpenhado || 0)}</p></div><div><p className="text-[9px] uppercase text-slate-500">Liquidado</p><p className="text-xs font-bold text-amber-700">{formatCurrency(despesa.valorLiquidado || 0)}</p></div><div><p className="text-[9px] uppercase text-slate-500">Pago</p><p className="text-xs font-bold text-amazon">{formatCurrency(despesa.valorPago || 0)}</p></div></div>
      </Link>) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">Nenhuma despesa encontrada para {currentYear}</p>}
    </div>

    <Card className="hidden overflow-hidden border border-border-subtle shadow-[0_8px_28px_rgba(18,52,91,0.08)] md:block"><CardContent className="p-0"><div className="portal-listing-scroll overflow-x-auto"><table className="portal-data-table w-full">
      <thead className="bg-institutional text-white"><tr>
        <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{th("Empenho", "numeroEmpenho", ClipboardList)}</th><th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{th("Credor/Fornecedor", "credorNome", UserRound)}</th><th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{titulo("Objeto", FileText)}</th><th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{titulo("Órgão", Building2)}</th><th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{th("Empenhado", "valorEmpenhado", Landmark)}</th><th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{th("Liquidado", "valorLiquidado", CircleDollarSign)}</th><th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{th("Pago", "valorPago", Banknote)}</th>
      </tr></thead>
      <tbody>{despesas.length ? despesas.map((despesa) => <tr key={despesa.id} id={`record-${despesa.id}`} role="link" tabIndex={0} onClick={() => router.push(`/despesas/${despesa.id}`)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/despesas/${despesa.id}`) }} className="cursor-pointer border-b border-slate-100 odd:bg-white even:bg-slate-50/55 hover:bg-red-50/60 focus:bg-red-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#B42318]">
        <td className="whitespace-nowrap px-3 py-2.5"><span className="rounded-md border border-blue-100 bg-blue-50 px-2 py-1 font-mono text-[11px] font-semibold text-digital">{despesa.numeroEmpenho}</span>{despesa.tipoMovimento === "Anulação" && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">Anulação</span>}<p className="mt-1 pl-0.5 text-[10px] text-slate-500">{data(despesa.dataEmpenho)}</p></td>
        <td className="max-w-52 px-3 py-2.5"><p className="truncate text-[13px] font-semibold text-institutional">{despesa.credorNome || "—"}</p><p className="truncate text-[10px] text-slate-500">{despesa.credorCpfCnpj || ""}</p></td><td className="max-w-52 px-3 py-2.5"><p className="truncate text-xs text-text-secondary" title={despesa.objeto || undefined}>{despesa.objeto || "—"}</p></td><td className="max-w-44 px-3 py-2.5"><p className="line-clamp-2 text-xs text-text-secondary">{despesa.orgaoNome || "—"}</p></td><td className={`whitespace-nowrap px-3 py-2.5 text-[13px] font-bold ${(despesa.valorEmpenhado || 0) < 0 ? "text-red-700" : "text-institutional"}`}>{formatCurrency(despesa.valorEmpenhado || 0)}</td><td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-bold text-amber-700">{formatCurrency(despesa.valorLiquidado || 0)}</td><td className="whitespace-nowrap px-3 py-2.5 text-[13px] font-extrabold text-amazon">{formatCurrency(despesa.valorPago || 0)}</td>
      </tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-600">Nenhuma despesa encontrada para {currentYear}</td></tr>}</tbody>
    </table></div></CardContent></Card>
  </>
}

function DespesasContent({ despesas, stats, currentYear, activePhase, pagination }: DespesasContentProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const linkFase = (fase: FaseDespesa) => {
    const params = new URLSearchParams(searchParams.toString())
    if (activePhase === fase) params.delete('fase')
    else params.set('fase', fase)
    params.delete('page')
    return `${pathname}${params.size ? `?${params.toString()}` : ''}`
  }
  const saldoLiquidar = Math.max(stats.empenhado - stats.liquidado, 0)
  const saldoPagar = Math.max(stats.liquidado - stats.pago, 0)
  const percentualLiquidado = stats.empenhado > 0 ? (stats.liquidado / stats.empenhado) * 100 : 0
  const percentualPago = stats.empenhado > 0 ? (stats.pago / stats.empenhado) * 100 : 0
  const percentualLiquidar = stats.empenhado > 0 ? (saldoLiquidar / stats.empenhado) * 100 : 0
  const percentualPagar = stats.liquidado > 0 ? (saldoPagar / stats.liquidado) * 100 : 0
  const indicadores = [
    { label: "Empenhado", value: formatCurrency(stats.empenhado), percentage: 100, percentageLabel: "100%", color: "#1677B8", softColor: "#EAF5FB", icon: <BadgeDollarSign className="h-4 w-4" />, href: linkFase('empenhado'), active: activePhase === 'empenhado' },
    { label: "Liquidado", value: formatCurrency(stats.liquidado), percentage: percentualLiquidado, percentageLabel: `${percentualLiquidado.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do empenhado`, color: "#A87512", softColor: "#FFF6DE", icon: <CircleDollarSign className="h-4 w-4" />, href: linkFase('liquidado'), active: activePhase === 'liquidado' },
    { label: "Pago", value: formatCurrency(stats.pago), percentage: percentualPago, percentageLabel: `${percentualPago.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do empenhado`, color: "#16845D", softColor: "#E8F6F0", icon: <Banknote className="h-4 w-4" />, href: linkFase('pago'), active: activePhase === 'pago' },
    { label: "A liquidar", value: formatCurrency(saldoLiquidar), percentage: percentualLiquidar, percentageLabel: `${percentualLiquidar.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do empenhado`, color: "#D97706", softColor: "#FFF4E5", href: linkFase('a_liquidar'), active: activePhase === 'a_liquidar' },
    { label: "Liquidado a pagar", value: formatCurrency(saldoPagar), percentage: percentualPagar, percentageLabel: `${percentualPagar.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do liquidado`, color: "#B42318", softColor: "#FDEDEC", href: linkFase('liquidado_a_pagar'), active: activePhase === 'liquidado_a_pagar' },
  ]
  return <>
    <ExecutionIndicators title="Execução da despesa" subtitle={`Acompanhamento orçamentário de ${currentYear}`} items={indicadores} />
    <div className="portal-listing-heading mb-3 flex items-end justify-between gap-4"><div><h2 className="text-lg font-bold text-institutional">Despesas encontradas</h2><p className="text-sm text-text-secondary">Empenhos, liquidações e pagamentos no exercício selecionado.</p></div><span className="hidden rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-[#B42318] sm:inline">{pagination?.total ?? despesas.length} registros</span></div>
    <DespesasTable despesas={despesas} currentYear={currentYear} />
    {pagination && <PaginationControls pagination={pagination} />}
    <Card className="mt-6 border-dashed bg-slate-50"><CardContent className="p-5"><h2 className="mb-2 font-semibold text-institutional">Entenda os valores</h2><div className="grid gap-2 text-xs text-text-secondary md:grid-cols-2"><p><strong>Empenho:</strong> reserva o crédito orçamentário.</p><p><strong>Liquidação:</strong> confirma o direito do credor.</p><p><strong>Pagamento:</strong> transfere o recurso ao credor.</p><p><strong>Anulação:</strong> cancela total ou parcialmente um empenho.</p></div></CardContent></Card>
  </>
}

export { DespesasContent, formatCurrency }
export type { DespesaWithAnexos, Stats }
