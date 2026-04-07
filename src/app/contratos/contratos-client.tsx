"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { FileText } from "lucide-react"
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

interface ContratoWithAnexos {
  id: string
  numero: string
  ano: number
  tipoContrato: string | null
  objeto: string
  status: string
  valorInicial: number
  contratadoNome: string
  contratadoCnpj: string | null
  anexos?: Attachment[]
}

interface Stats {
  total: number
  vigentes: number
  encerrados: number
  valorTotal: number
}

interface ContratosContentProps {
  contratos: ContratoWithAnexos[]
  stats: Stats
  currentYear: number
  searchParams?: { q?: string; ano?: string; status?: string; tipo?: string }
}

export function ContratosContent({ contratos, stats, currentYear }: ContratosContentProps) {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Vigentes</p>
            <p className="text-2xl font-bold text-green-600">{stats.vigentes}</p>
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
            <p className="text-sm text-slate-600">Encerrados</p>
            <p className="text-lg font-bold">{stats.encerrados}</p>
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
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Contratado</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length > 0 ? contratos.map((contrato) => (
                <tr key={contrato.id} id={`record-${contrato.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                  <td className="px-4 py-3">
                    <span className="font-bold text-amber-800">{contrato.numero}/{contrato.ano}</span>
                    <p className="text-xs text-slate-600">{contrato.tipoContrato || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{contrato.contratadoNome}</p>
                    <p className="text-xs text-slate-600">{contrato.contratadoCnpj || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {contrato.objeto}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      contrato.status === 'vigente' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {contrato.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800">
                    {formatCurrency(contrato.valorInicial)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AttachmentsCell anexos={contrato.anexos} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    Nenhum contrato encontrado
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

export type { ContratoWithAnexos, Stats }