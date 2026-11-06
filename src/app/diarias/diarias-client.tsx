"use client"

import React from "react"
import Link from "next/link"
import { CalendarDays, Receipt, Wallet } from "lucide-react"
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

function formatarQuantidade(valor: number | null): string {
  if (valor === null) return '-'
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
}

interface Diaria {
  id: string
  data: Date | string | null
  favorecido: string
  cargo: string | null
  cpf: string | null
  orgaoNome: string | null
  unidadeNome: string | null
  descricao: string | null
  quantidade: number | null
  valor: number
  numeroEmpenho: string | null
}

interface Totais {
  valor: number
  quantidade: number
  comQuantidade: number
}

interface DiariasContentProps {
  diarias: Diaria[]
  totais: Totais
  currentYear: number
  pagination: PaginationMeta
}

export function DiariasContent({ diarias, totais, currentYear, pagination }: DiariasContentProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-rose-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total pago</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totais.valor)}</p>
              </div>
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-rose-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Diárias concedidas</p>
                <p className="text-2xl font-bold text-slate-800">{formatarQuantidade(totais.quantidade)}</p>
                {totais.comQuantidade < pagination.total && (
                  <p className="text-xs text-slate-500">
                    informada em {totais.comQuantidade} de {pagination.total} pagamentos
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <CalendarDays className="h-6 w-6 text-amber-800" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Pagamentos</p>
                <p className="text-2xl font-bold text-slate-800">{pagination.total.toLocaleString('pt-BR')}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <Receipt className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Data</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Favorecido</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Órgão</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Motivo</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Qtd.</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {diarias.length > 0 ? diarias.map((diaria) => (
                  <tr key={diaria.id} id={`record-${diaria.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400 align-top">
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {diaria.data ? new Date(diaria.data).toLocaleDateString('pt-BR') : '-'}
                      {diaria.numeroEmpenho && <p className="text-xs text-slate-500">Empenho {diaria.numeroEmpenho}</p>}
                    </td>
                    <td className="px-4 py-3 min-w-[13rem]">
                      <Link href={`/diarias/${diaria.id}`} className="font-medium text-slate-800 hover:text-rose-700 hover:underline">
                        {diaria.favorecido}
                      </Link>
                      {diaria.cargo && <p className="text-xs text-slate-600">{diaria.cargo}</p>}
                      {diaria.cpf && <p className="text-xs text-slate-500 whitespace-nowrap">CPF {diaria.cpf}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 min-w-[11rem]">
                      {diaria.orgaoNome || '-'}
                      {diaria.unidadeNome && diaria.unidadeNome !== diaria.orgaoNome && (
                        <p className="text-xs text-slate-500">{diaria.unidadeNome}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 min-w-[14rem] max-w-md">
                      <p className="line-clamp-2" title={diaria.descricao || undefined}>{diaria.descricao || '-'}</p>
                      {(diaria.descricao?.length ?? 0) > 120 && (
                        <Link href={`/diarias/${diaria.id}`} className="text-xs text-rose-700 hover:underline">ler tudo</Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">{formatarQuantidade(diaria.quantidade)}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-800 whitespace-nowrap">
                      {formatCurrency(diaria.valor)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                      Nenhuma diária encontrada para {currentYear}
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
          <h2 className="font-semibold text-slate-800 mb-2">Sobre os dados de diárias</h2>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Diária:</strong> valor pago ao servidor ou autoridade para cobrir hospedagem, alimentação e locomoção em viagens a serviço.</p>
            <p><strong>Fonte:</strong> sistema contábil do município (Fiorilli SCPI), com um registro por pagamento.</p>
            <p><strong>Privacidade:</strong> o CPF já é publicado mascarado pelo sistema de origem, conforme a LGPD.</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
