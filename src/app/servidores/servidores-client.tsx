"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { AttachmentsCell } from "@/components/attachments/attachments-modal"
import { PaginationControls } from "@/components/portal/pagination-controls"
import type { PaginationMeta } from "@/lib/site-data"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

interface Attachment {
  id: string
  nomeArquivo: string
  urlArquivo: string
  tamanho: number | null
  tipoMime: string | null
}

interface ServidorWithAnexos {
  id: string
  nome: string
  matricula: string | null
  cargo: string | null
  funcao: string | null
  lotacao: string | null
  vinculo: string | null
  remuneracaoBruta: number | null
  remuneracaoLiquida: number | null
  anoReferencia: number | null
  anexos?: Attachment[]
}

interface Stats {
  total: number
  totalRemuneracao: number
}

interface ServidoresContentProps {
  servidores: ServidorWithAnexos[]
  stats: Stats
  currentYear: number | null
  pagination?: PaginationMeta
}

export function ServidoresContent({ servidores, stats, currentYear, pagination }: ServidoresContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total de Servidores</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Em {currentYear}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Folha Bruta</p>
            <p className="text-lg font-bold">{formatCurrency(stats.totalRemuneracao)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Ano Referência</p>
            <p className="text-xl font-bold">{currentYear}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cargo/Função</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Lotação</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vínculo</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Rem. Bruta</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Rem. Líquida</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
              </tr>
            </thead>
            <tbody>
              {servidores.length > 0 ? servidores.map((servidor) => (
                <tr key={servidor.id} id={`record-${servidor.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                  <td className="px-4 py-3">
                    <p className="font-medium">{servidor.nome}</p>
                    <p className="text-xs text-slate-600">{servidor.matricula}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm">{servidor.cargo}</p>
                    {servidor.funcao && <p className="text-xs text-slate-600">{servidor.funcao}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm">{servidor.lotacao || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      servidor.vinculo === 'efetivo' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {servidor.vinculo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(servidor.remuneracaoBruta || 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800">
                    {formatCurrency(servidor.remuneracaoLiquida || 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AttachmentsCell anexos={servidor.anexos} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                    Nenhum servidor encontrado para {currentYear}
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {pagination && <PaginationControls pagination={pagination} />}
    </>
  )
}

export type { ServidorWithAnexos, Stats }
