"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { HandCoins } from "lucide-react"
import { AttachmentsCell } from "@/components/attachments/attachments-modal"

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

interface ConvenioWithAnexos {
  id: string
  numero: string
  ano: number
  tipo: string | null
  objeto: string
  status: string
  valorTotal: number
  concedente: string
  concedenteCnpj: string | null
  dataInicioVigencia: Date | null
  dataFimVigencia: Date | null
  anexos?: Attachment[]
}

interface Stats {
  total: number
  valorTotal: number
}

interface ConveniosContentProps {
  convenios: ConvenioWithAnexos[]
  stats: Stats
  currentYear: number
}

export function ConveniosContent({ convenios, stats, currentYear }: ConveniosContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total em {currentYear}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Em Execução</p>
            <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Valor Total</p>
            <p className="text-lg font-bold">{formatCurrency(stats.valorTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Convênios</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nº/Ano</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Concedente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor Total</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
              </tr>
            </thead>
            <tbody>
              {convenios.length > 0 ? convenios.map((conv) => (
                <tr key={conv.id} id={`record-${conv.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                  <td className="px-4 py-3">
                    <span className="font-bold text-cyan-600">{conv.numero}/{conv.ano}</span>
                    <p className="text-xs text-slate-600">{conv.tipo}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{conv.concedente}</p>
                    <p className="text-xs text-slate-600">{conv.concedenteCnpj || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {conv.objeto}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      conv.status === 'em_execucao' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {conv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800">
                    {formatCurrency(conv.valorTotal)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AttachmentsCell anexos={conv.anexos} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    Nenhum convênio encontrado para {currentYear}
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export type { ConvenioWithAnexos, Stats }