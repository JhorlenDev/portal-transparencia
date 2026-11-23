"use client"

import React from "react"
import Link from "next/link"
import { CalendarDays, Receipt, Wallet } from "lucide-react"
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
  const cobertura = pagination.total > 0 ? totais.comQuantidade / pagination.total * 100 : 0
  const indicadores = [
    { label: 'Total pago', value: formatCurrency(totais.valor), percentage: 100, percentageLabel: String(currentYear), color: '#8B5E34', softColor: '#F8F0E8', icon: <Wallet className="h-4 w-4" /> },
    { label: 'Diárias concedidas', value: formatarQuantidade(totais.quantidade), percentage: cobertura, percentageLabel: `${cobertura.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% informada`, color: '#A87512', softColor: '#FFF6DE', icon: <CalendarDays className="h-4 w-4" /> },
    { label: 'Pagamentos', value: pagination.total.toLocaleString('pt-BR'), percentage: 100, percentageLabel: 'registros', color: '#475569', softColor: '#EDF1F5', icon: <Receipt className="h-4 w-4" /> },
  ]
  return (
    <>
      <ExecutionIndicators title="Panorama das diárias" subtitle={`Pagamentos realizados em ${currentYear}`} items={indicadores} />

      <div className="portal-listing-heading mb-3"><h2 className="text-lg font-bold text-institutional">Diárias encontradas</h2><p className="text-sm text-text-secondary">Viagens e pagamentos no exercício selecionado.</p></div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table compact-public-table w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Empenho</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Favorecido</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Órgão</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Motivo</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Qtd.</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody>
                {diarias.length > 0 ? diarias.map((diaria) => (
                  <tr key={diaria.id} id={`record-${diaria.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400 align-top">
                    <td className="whitespace-nowrap px-4 py-3">
                      <p className="font-mono text-sm font-bold text-institutional">{diaria.numeroEmpenho || '—'}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {diaria.data ? new Date(diaria.data).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : 'Data não informada'}
                      </p>
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
                    <td className="px-4 py-3 text-left text-sm">{formatarQuantidade(diaria.quantidade)}</td>
                    <td className="px-4 py-3 text-left font-bold text-rose-800 whitespace-nowrap">
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
