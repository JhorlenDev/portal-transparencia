"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, ArrowLeftRight, RotateCcw, Wallet } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PaginationControls } from "@/components/portal/pagination-controls"
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
  const maior = porRecebedora[0]?.valor || 0

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total repassado ({periodo})</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totais.repasse)}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-indigo-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Devoluções</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totais.devolucao)}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <RotateCcw className="h-6 w-6 text-amber-800" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Lançamentos</p>
                <p className="text-2xl font-bold text-slate-800">{pagination.total.toLocaleString('pt-BR')}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <ArrowLeftRight className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Data</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">De</th>
                  <th className="px-2 py-3" aria-hidden />
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Para</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Repasse</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Devolução</th>
                </tr>
              </thead>
              <tbody>
                {transferencias.length > 0 ? transferencias.map((t) => (
                  <tr key={t.id} id={`record-${t.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {t.data ? new Date(t.data).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      <span className="text-sm font-medium text-slate-800">{t.entidadePagadora}</span>
                      {t.cnpjPagadora && <p className="text-xs text-slate-500 whitespace-nowrap">{t.cnpjPagadora}</p>}
                    </td>
                    <td className="px-2 py-3 text-slate-400"><ArrowRight className="h-4 w-4" aria-label="para" /></td>
                    <td className="px-4 py-3 min-w-[12rem]">
                      <span className="text-sm font-medium text-slate-800">{t.entidadeRecebedora}</span>
                      {t.cnpjRecebedora && <p className="text-xs text-slate-500 whitespace-nowrap">{t.cnpjRecebedora}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-indigo-800 whitespace-nowrap">
                      {formatCurrency(t.valorRepasse)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600 whitespace-nowrap">
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
