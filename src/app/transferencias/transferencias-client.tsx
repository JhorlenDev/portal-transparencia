"use client"

import React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, ArrowLeftRight, RotateCcw, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PaginationControls } from "@/components/portal/pagination-controls"
import { ExecutionIndicators } from "@/components/portal/execution-indicators"
import type { PaginationMeta } from "@/lib/site-data"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(Number.isFinite(value) ? value : 0)
}

interface Transferencia {
  id: string
  mes: number | null
  data: Date | string | null
  entidadePagadora: string
  cnpjPagadora: string | null
  entidadeRecebedora: string
  cnpjRecebedora: string | null
  valorRepasse: number
  valorDevolucao: number | null
}

interface Totais {
  repasse: number
  devolucao: number
}

interface Recebedora {
  entidade: string
  valor: number
  lancamentos: number
}

interface TransferenciasContentProps {
  transferencias: Transferencia[]
  totais: Totais
  porRecebedora: Recebedora[]
  periodo: string
  pagination: PaginationMeta
}

export function TransferenciasContent({ transferencias, totais, porRecebedora, periodo, pagination }: TransferenciasContentProps) {
  const router = useRouter()
  const maior = porRecebedora[0]?.valor || 0
  const percentualDevolucao = totais.repasse > 0 ? totais.devolucao / totais.repasse * 100 : 0
  const indicadores = [
    { label: 'Total repassado', value: formatCurrency(totais.repasse), percentage: 100, percentageLabel: periodo, color: '#4F46A5', softColor: '#F0EFFB', icon: <Wallet className="h-4 w-4" /> },
    { label: 'Devoluções', value: formatCurrency(totais.devolucao), percentage: percentualDevolucao, percentageLabel: `${percentualDevolucao.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do repasse`, color: '#A87512', softColor: '#FFF6DE', icon: <RotateCcw className="h-4 w-4" /> },
    { label: 'Lançamentos', value: pagination.total.toLocaleString('pt-BR'), percentage: 100, percentageLabel: 'registros', color: '#475569', softColor: '#EDF1F5', icon: <ArrowLeftRight className="h-4 w-4" /> },
  ]

  return (
    <>
      <ExecutionIndicators title="Panorama das transferências" subtitle={`Movimentação entre entidades em ${periodo}`} items={indicadores} />

      {porRecebedora.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-5">
            <h2 className="font-semibold text-slate-800 mb-4">Quanto cada entidade recebeu</h2>
            <ul className="space-y-3">
              {porRecebedora.map((r) => (
                <li key={r.entidade}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
                    <span className="font-medium text-slate-700">{r.entidade}</span>
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {formatCurrency(r.valor)}
                      <span className="ml-2 text-xs font-normal text-slate-500">{r.lancamentos} lanç.</span>
                    </span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden" aria-hidden>
                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${maior > 0 ? Math.max((r.valor / maior) * 100, 1) : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="portal-listing-heading mb-3"><h2 className="text-lg font-bold text-institutional">Transferências encontradas</h2><p className="text-sm text-text-secondary">Repasses entre entidades no período selecionado.</p></div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table compact-public-table w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Data</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">De</th>
                  <th className="px-2 py-3" aria-hidden />
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Para</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Repasse</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Devolução</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.length > 0 ? transferencias.map((t) => (
                  <tr key={t.id} id={`record-${t.id}`} role="link" tabIndex={0} onClick={(evento) => { if (!(evento.target as HTMLElement).closest("a,button")) router.push(`/transferencias/${t.id}`) }} onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") router.push(`/transferencias/${t.id}`) }} className="cursor-pointer border-b border-slate-200 transition-colors target:border-yellow-400 target:bg-yellow-100 focus:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      <span className="text-sm font-medium text-slate-800">{t.entidadePagadora}</span>
                      {t.cnpjPagadora && <p className="text-xs text-slate-500 whitespace-nowrap">{t.cnpjPagadora}</p>}
                    </td>
                    <td className="px-2 py-3 text-slate-400"><ArrowRight className="h-4 w-4" aria-label="para" /></td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      <Link href={`/transferencias/${t.id}`} className="text-sm font-medium text-slate-800 hover:text-digital hover:underline">{t.entidadeRecebedora}</Link>
                      {t.cnpjRecebedora && <p className="text-xs text-slate-500 whitespace-nowrap">{t.cnpjRecebedora}</p>}
                    </td>
                    <td className="px-4 py-3 text-left font-bold text-indigo-800 whitespace-nowrap">
                      {formatCurrency(t.valorRepasse)}
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-slate-600 whitespace-nowrap">
                      {t.valorDevolucao ? formatCurrency(t.valorDevolucao) : '-'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                      Nenhuma transferência encontrada para {periodo}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <PaginationControls pagination={pagination} />

      <Card className="mt-8 bg-slate-50 border-dashed">
        <CardContent className="p-6">
          <h2 className="font-semibold text-slate-800 mb-2">Sobre as transferências entre entidades</h2>
          <div className="text-sm text-slate-600 space-y-2">
            <p>São repasses financeiros entre a Prefeitura e os fundos e entidades do próprio município, como o repasse mensal ao Fundo Municipal de Saúde ou de Educação. Não são recursos novos: o dinheiro muda de conta dentro do município.</p>
            <p>Convênios e transferências recebidas de outros governos (União e Estado) estão em <Link href="/convenios" className="text-emerald-700 hover:underline">Convênios</Link> e em <Link href="/receitas" className="text-emerald-700 hover:underline">Receitas</Link>.</p>
            <p><strong>Fonte:</strong> sistema contábil do município (Fiorilli SCPI).</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
