"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDown, ArrowUp, ArrowUpDown, ArrowUpRight, BadgeDollarSign, ChevronRight, CircleGauge } from "lucide-react"
import { PaginationControls } from "@/components/portal/pagination-controls"
import { ExecutionIndicators } from "@/components/portal/execution-indicators"
import type { PaginationMeta } from "@/lib/site-data"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

interface ReceitaWithAnexos {
  id: string
  codigoNatureza: string
  naturezaReceita: string
  categoriaEconomica: string
  valorPrevisto: number
  valorArrecadado: number | null
  exercicio: number
  mes: number | null
  fonteRecursoNome?: string | null
}

interface Stats {
  previsto: number
  arrecadado: number
}

interface ReceitasContentProps {
  receitas: ReceitaWithAnexos[]
  stats: Stats
  currentYear: number
  activePhase?: FaseReceita
  pagination?: PaginationMeta
}

type FaseReceita = 'previsto' | 'arrecadado' | 'excesso' | 'a_arrecadar'

export function ReceitasContent({ receitas, stats, currentYear, activePhase, pagination }: ReceitasContentProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const percentualGeral = stats.previsto > 0 ? (stats.arrecadado / stats.previsto) * 100 : 0
  const acimaDaPrevisao = stats.arrecadado >= stats.previsto
  const diferenca = Math.abs(stats.arrecadado - stats.previsto)
  const percentualDiferenca = stats.previsto > 0 ? (diferenca / stats.previsto) * 100 : 0
  const linkFase = (fase: FaseReceita) => {
    const params = new URLSearchParams(searchParams.toString())
    if (activePhase === fase) params.delete('fase')
    else params.set('fase', fase)
    params.delete('page')
    return `${pathname}${params.size ? `?${params.toString()}` : ''}`
  }
  const faseDiferenca: FaseReceita = acimaDaPrevisao ? 'excesso' : 'a_arrecadar'
  const indicadores = [
    { label: "Previsão", value: formatCurrency(stats.previsto), percentage: 100, percentageLabel: "100%", color: "#1677B8", softColor: "#EAF5FB", icon: <BadgeDollarSign className="h-4 w-4" />, href: linkFase('previsto'), active: activePhase === 'previsto' },
    { label: "Arrecadado", value: formatCurrency(stats.arrecadado), percentage: percentualGeral, percentageLabel: `${percentualGeral.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% da previsão`, color: "#16845D", softColor: "#E8F6F0", icon: <ArrowUpRight className="h-4 w-4" />, href: linkFase('arrecadado'), active: activePhase === 'arrecadado' },
    { label: acimaDaPrevisao ? "Excesso de arrecadação" : "A arrecadar", value: formatCurrency(diferenca), percentage: percentualDiferenca, percentageLabel: `${percentualDiferenca.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ${acimaDaPrevisao ? 'acima' : 'da previsão'}`, color: acimaDaPrevisao ? "#A87512" : "#B42318", softColor: acimaDaPrevisao ? "#FFF6DE" : "#FDEDEC", icon: <CircleGauge className="h-4 w-4" />, href: linkFase(faseDiferenca), active: activePhase === faseDiferenca },
  ]

  const ordenarPor = (campo: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const mesmaColuna = params.get("ordenar") === campo
    params.set("ordenar", campo)
    params.set("ordem", mesmaColuna && params.get("ordem") !== "asc" ? "asc" : "desc")
    params.delete("page")
    return `${pathname}?${params.toString()}`
  }

  const iconeOrdem = (campo: string) => {
    if (searchParams.get("ordenar") !== campo) return <ArrowUpDown className="h-3.5 w-3.5 opacity-45" />
    return searchParams.get("ordem") === "asc" ? <ArrowUp className="h-3.5 w-3.5 text-gold" /> : <ArrowDown className="h-3.5 w-3.5 text-gold" />
  }

  const cabecalho = (rotulo: string, campo: string) => (
    <Link href={ordenarPor(campo)} className="inline-flex items-center gap-1.5 rounded px-1 py-1 transition hover:bg-white/10 hover:text-white" title={`Ordenar por ${rotulo}`}>
      {rotulo}{iconeOrdem(campo)}
    </Link>
  )

  return (
    <>
      <ExecutionIndicators title="Execução da receita" subtitle={`Previsão e arrecadação de ${currentYear}`} items={indicadores} />

      <div className="portal-listing-stage">
      <div className="portal-listing-heading mb-3 flex items-end justify-between gap-4">
        <div><h2 className="text-lg font-bold text-institutional">Receitas encontradas</h2><p className="text-sm text-text-secondary">Valores previstos e arrecadados no exercício selecionado.</p></div>
        <span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-amazon sm:inline">{pagination?.total ?? receitas.length} registros</span>
      </div>

      <div className="space-y-3 md:hidden">
        {receitas.length > 0 ? receitas.map((receita) => {
          const percentual = receita.valorPrevisto > 0 ? ((receita.valorArrecadado || 0) / receita.valorPrevisto) * 100 : 0
          return <Link key={receita.id} href={`/receitas/${receita.id}`} className="group block rounded-2xl border border-emerald-100 bg-white p-4 shadow-[0_5px_18px_rgba(18,52,91,0.07)] transition hover:border-emerald-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><span className="rounded-md bg-emerald-50 px-2 py-1 font-mono text-[10px] font-semibold text-amazon">{receita.codigoNatureza}</span><h3 className="mt-2 line-clamp-2 text-sm font-bold text-institutional">{receita.naturezaReceita}</h3></div><ChevronRight className="h-5 w-5 shrink-0 text-slate-300 group-hover:text-amazon" /></div>
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3"><div><p className="text-[10px] uppercase text-slate-500">Previsto</p><p className="text-sm font-bold text-text-primary">{formatCurrency(receita.valorPrevisto)}</p></div><div className="text-right"><p className="text-[10px] uppercase text-slate-500">Arrecadado</p><p className="text-sm font-extrabold text-amazon">{formatCurrency(receita.valorArrecadado || 0)}</p></div></div>
            <div className="mt-3 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${percentual > 100 ? 'bg-gold' : 'bg-amazon'}`} style={{ width: `${Math.min(percentual, 100)}%` }} /></div><span className="text-xs font-bold text-amazon">{receita.valorPrevisto > 0 ? `${percentual.toFixed(1)}%` : '—'}</span></div>
          </Link>
        }) : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">Nenhuma receita encontrada para {currentYear}</p>}
      </div>

      <Card className="portal-listing-card hidden overflow-hidden border border-border-subtle shadow-[0_8px_28px_rgba(18,52,91,0.08)] md:block">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table w-full">
            <thead className="border-b border-slate-200 bg-institutional text-white">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{cabecalho("Código", "codigoNatureza")}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{cabecalho("Natureza da receita", "naturezaReceita")}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{cabecalho("Categoria", "categoriaEconomica")}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{cabecalho("Competência", "mes")}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{cabecalho("Previsto", "valorPrevisto")}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">{cabecalho("Arrecadado", "valorArrecadado")}</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide">Realização</th>
              </tr>
            </thead>
            <tbody>
              {receitas.length > 0 ? receitas.map((receita) => {
                const percentual = receita.valorPrevisto > 0 
                  ? ((receita.valorArrecadado || 0) / receita.valorPrevisto) * 100 
                  : 0
                return (
                  <tr
                    key={receita.id}
                    id={`record-${receita.id}`}
                    role="link"
                    tabIndex={0}
                    aria-label={`Ver detalhes de ${receita.naturezaReceita}`}
                    onClick={() => router.push(`/receitas/${receita.id}`)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push(`/receitas/${receita.id}`) }}
                    className="cursor-pointer border-b border-slate-100 transition-all odd:bg-white even:bg-slate-50/55 hover:bg-emerald-50/80 focus:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amazon target:border-yellow-400 target:bg-yellow-100"
                  >
                    <td className="px-3 py-2.5"><span className="rounded-md bg-blue-50 px-2 py-1 font-mono text-[11px] text-digital">{receita.codigoNatureza}</span></td>
                    <td className="max-w-xs px-3 py-2.5"><span className="line-clamp-1 text-[13px] font-semibold text-institutional">{receita.naturezaReceita}</span></td>
                    <td className="px-3 py-2.5">
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-amazon">
                        {receita.categoriaEconomica}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-medium text-slate-600">{receita.mes ? `${receita.mes.toString().padStart(2, "0")}/${receita.exercicio}` : receita.exercicio}</td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-medium text-slate-600">
                      {formatCurrency(receita.valorPrevisto)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-left text-[13px] font-extrabold text-amazon">
                      {formatCurrency(receita.valorArrecadado || 0)}
                    </td>
                    <td className="px-3 py-2.5 text-left">
                      {receita.valorPrevisto > 0 ? (
                        <div className="flex min-w-28 items-center gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
                            <div 
                              className={`h-full rounded-full ${percentual > 100 ? 'bg-gold' : 'bg-amazon'}`}
                              style={{ width: `${Math.min(percentual, 100)}%` }} 
                            />
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${percentual > 100 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-amazon'}`}>{percentual.toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500" title="Sem previsão para esta receita">Sem previsão</span>
                      )}
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                    Nenhuma receita encontrada para {currentYear}
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination && <PaginationControls pagination={pagination} />}
      </div>
    </>
  )
}

export type { ReceitaWithAnexos, Stats }
