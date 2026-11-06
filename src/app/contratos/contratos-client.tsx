"use client"

import React from "react"
import Link from "next/link"
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

interface ContratoWithAnexos {
  id: string
  numero: string
  ano: number
  tipoContrato: string | null
  objeto: string
  status: string
  modalidade?: string | null
  valorInicial: number
  valorAtual?: number | null
  contratadoNome: string
  contratadoCnpj: string | null
  dataInicioVigencia?: Date | string | null
  dataFimVigencia?: Date | string | null
  licitacaoNumero?: string | null
  licitacao?: { id: string; numero: string; ano: number; numeroProcesso: string | null; modalidade: string } | null
  anexos?: Attachment[]
}

const CORES_STATUS: Record<string, string> = {
  vigente: 'bg-green-100 text-green-700',
  encerrado: 'bg-slate-100 text-slate-700',
  anulado: 'bg-red-100 text-red-700',
}

function formatarData(data: Date | string | null | undefined): string {
  return data ? new Date(data).toLocaleDateString('pt-BR') : '-'
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
  pagination?: PaginationMeta
}

export function ContratosContent({ contratos, stats, currentYear, pagination }: ContratosContentProps) {
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
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vigência</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length > 0 ? contratos.map((contrato) => (
                <tr key={contrato.id} id={`record-${contrato.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                  <td className="px-4 py-3">
                    <Link href={`/contratos/${contrato.id}`} className="font-bold text-amber-800 hover:underline">
                      {contrato.numero.includes('/') ? contrato.numero : `${contrato.numero}/${contrato.ano}`}
                    </Link>
                    <p className="text-xs text-slate-600">{contrato.modalidade || contrato.tipoContrato || '-'}</p>
                    {contrato.licitacao ? (
                      <Link
                        href={`/licitacoes/${contrato.licitacao.id}`}
                        className="text-xs text-purple-700 hover:underline whitespace-nowrap"
                      >
                        Processo {contrato.licitacao.numeroProcesso || contrato.licitacao.numero}
                      </Link>
                    ) : contrato.licitacaoNumero ? (
                      <p className="text-xs text-slate-500 whitespace-nowrap">Processo {contrato.licitacaoNumero}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{contrato.contratadoNome}</p>
                    <p className="text-xs text-slate-600">{contrato.contratadoCnpj || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                    {contrato.objeto}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {formatarData(contrato.dataInicioVigencia)}
                    <p className="text-xs text-slate-500">até {formatarData(contrato.dataFimVigencia)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs capitalize ${CORES_STATUS[contrato.status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {contrato.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-800 whitespace-nowrap">
                    {formatCurrency(contrato.valorAtual ?? contrato.valorInicial)}
                    {contrato.valorAtual != null && contrato.valorAtual !== contrato.valorInicial && (
                      <p className="text-xs font-normal text-slate-500">inicial {formatCurrency(contrato.valorInicial)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <AttachmentsCell anexos={contrato.anexos} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                    Nenhum contrato encontrado
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

export type { ContratoWithAnexos, Stats }
