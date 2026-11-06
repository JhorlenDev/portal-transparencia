"use client"

import React from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { AttachmentsCell } from "@/components/attachments/attachments-modal"
import { PaginationControls } from "@/components/portal/pagination-controls"
import type { PaginationMeta } from "@/lib/site-data"
import { statusLicitacao } from "./status"

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

interface LicitacaoWithAnexos {
  id: string
  numero: string
  ano: number
  objeto: string
  status: string
  modalidade: string | null
  numeroProcesso?: string | null
  dataAbertura: Date | null
  valorEstimado: number | null
  anexos?: Attachment[]
}

interface Stats {
  total: number
  porStatus: { status: string; _count: number }[]
}

interface LicitacoesContentProps {
  licitacoes: LicitacaoWithAnexos[]
  stats: Stats
  currentYear: number
  pagination?: PaginationMeta
}

export function LicitacoesContent({ licitacoes, stats, currentYear, pagination }: LicitacoesContentProps) {
  const emAndamento = stats.porStatus.find((s) => s.status === 'em_andamento')?._count || 0
  const homologados = stats.porStatus.find((s) => s.status === 'homologado')?._count || 0
  const encerrados = stats.porStatus.find((s) => s.status === 'encerrado')?._count || 0

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
            <p className="text-sm text-slate-600">Em andamento</p>
            <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Homologados</p>
            <p className="text-2xl font-bold text-green-600">{homologados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">Encerrados</p>
            <p className="text-2xl font-bold text-slate-700">{encerrados}</p>
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
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Abertura</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
              </tr>
            </thead>
            <tbody>
              {licitacoes.length > 0 ? licitacoes.map((licitacao) => (
                <tr key={licitacao.id} id={`record-${licitacao.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                  <td className="px-4 py-3">
                    <Link href={`/licitacoes/${licitacao.id}`} className="font-bold text-purple-600 hover:underline">
                      {licitacao.numero}/{licitacao.ano}
                    </Link>
                    <p className="text-xs text-slate-600">{licitacao.modalidade}</p>
                    {licitacao.numeroProcesso && (
                      <p className="text-xs text-slate-500">Processo {licitacao.numeroProcesso}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-md truncate">
                    {licitacao.objeto}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs whitespace-nowrap ${statusLicitacao(licitacao.status).cor}`}>
                      {statusLicitacao(licitacao.status).label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {licitacao.dataAbertura 
                      ? new Date(licitacao.dataAbertura).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {licitacao.valorEstimado === null ? '-' : formatCurrency(licitacao.valorEstimado)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AttachmentsCell anexos={licitacao.anexos} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    Nenhuma licitação encontrada para {currentYear}
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

export type { LicitacaoWithAnexos, Stats }
