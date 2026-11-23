"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Banknote, Building2, CalendarDays, CheckCircle2, CircleDot, FileCheck2, Files, FileText, Hash } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const statusAtivo = searchParams.get('status')
  const linkStatus = (status?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) params.set('status', status)
    else params.delete('status')
    params.delete('page')
    return `${pathname}${params.size ? `?${params}` : ''}`
  }
  const percentual = (valor: number) => stats.total > 0 ? valor / stats.total * 100 : 0
  const indicadores = [
    { label: `Total em ${currentYear}`, value: stats.total.toLocaleString('pt-BR'), percentage: 100, percentageLabel: '100%', color: '#1677B8', softColor: '#EAF5FB', icon: <Files className="h-4 w-4" />, href: linkStatus(), active: !statusAtivo },
    { label: 'Vigentes', value: stats.vigentes.toLocaleString('pt-BR'), percentage: percentual(stats.vigentes), percentageLabel: `${percentual(stats.vigentes).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total`, color: '#16845D', softColor: '#E8F6F0', icon: <CheckCircle2 className="h-4 w-4" />, href: linkStatus('vigente'), active: statusAtivo === 'vigente' },
    { label: 'Valor total', value: formatCurrency(stats.valorTotal), percentage: 100, percentageLabel: 'contratado', color: '#A87512', softColor: '#FFF6DE', icon: <Banknote className="h-4 w-4" />, href: linkStatus(), active: false },
    { label: 'Encerrados', value: stats.encerrados.toLocaleString('pt-BR'), percentage: percentual(stats.encerrados), percentageLabel: `${percentual(stats.encerrados).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total`, color: '#475569', softColor: '#EDF1F5', icon: <FileCheck2 className="h-4 w-4" />, href: linkStatus('encerrado'), active: statusAtivo === 'encerrado' },
  ]
  const titulo = (rotulo: string, Icone: typeof Files) => <span className="inline-flex items-center gap-1.5"><Icone className="h-3.5 w-3.5 text-gold" aria-hidden="true" />{rotulo}</span>
  return (
    <>
      <ExecutionIndicators title="Panorama dos contratos" subtitle={`Instrumentos administrativos de ${currentYear}`} items={indicadores} />

      <div className="portal-listing-heading mb-3"><h2 className="text-lg font-bold text-institutional">Contratos encontrados</h2><p className="text-sm text-text-secondary">Instrumentos administrativos do exercício selecionado.</p></div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table compact-public-table w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo('Contrato', Hash)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo('Contratado', Building2)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo('Objeto', FileText)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo('Vigência', CalendarDays)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo('Status', CircleDot)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo('Valor', Banknote)}</th>
              </tr>
            </thead>
            <tbody>
              {contratos.length > 0 ? contratos.map((contrato) => (
                <tr key={contrato.id} id={`record-${contrato.id}`} role="link" tabIndex={0} onClick={(evento) => { if (!(evento.target as HTMLElement).closest('a,button')) router.push(`/contratos/${contrato.id}`) }} onKeyDown={(evento) => { if (evento.key === 'Enter') router.push(`/contratos/${contrato.id}`) }} className="cursor-pointer border-b border-slate-200 transition-colors target:border-yellow-400 target:bg-yellow-100 focus:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-digital">
                  <td className="px-4 py-3">
                    <Link href={`/contratos/${contrato.id}`} className="inline-flex items-baseline gap-1 rounded-md border border-blue-100 bg-blue-50 px-2 py-0.5 text-digital hover:no-underline">
                      <span className="text-[9px] font-semibold uppercase opacity-75">Contrato:</span><span className="font-bold">{contrato.numero.includes('/') ? contrato.numero : `${contrato.numero}/${contrato.ano}`}</span>
                    </Link>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">{contrato.modalidade || contrato.tipoContrato || '-'}</p>
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
                  <td className="whitespace-nowrap px-4 py-3 text-left font-bold text-digital">
                    {formatCurrency(contrato.valorAtual ?? contrato.valorInicial)}
                    {contrato.valorAtual != null && contrato.valorAtual !== contrato.valorInicial && (
                      <p className="text-xs font-normal text-slate-500">inicial {formatCurrency(contrato.valorInicial)}</p>
                    )}
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

      {pagination && <PaginationControls pagination={pagination} />}
    </>
  )
}

export type { ContratoWithAnexos, Stats }
