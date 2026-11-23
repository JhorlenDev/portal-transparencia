"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Banknote, CalendarDays, CheckCircle2, CircleDot, FileCheck2, FileText, Hash, Scale } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PaginationControls } from "@/components/portal/pagination-controls"
import { ExecutionIndicators } from "@/components/portal/execution-indicators"
import type { PaginationMeta } from "@/lib/site-data"
import { corModalidadeLicitacao, statusLicitacao } from "./status"

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

function referenciaLicitacao(numero: string, ano: number) {
  return numero.includes("/") ? numero : `${numero}/${ano}`
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
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const emAndamento = stats.porStatus.find((s) => s.status === 'em_andamento')?._count || 0
  const homologados = stats.porStatus.find((s) => s.status === 'homologado')?._count || 0
  const encerrados = stats.porStatus.find((s) => s.status === 'encerrado')?._count || 0
  const percentual = (valor: number) => stats.total > 0 ? (valor / stats.total) * 100 : 0
  const statusAtivo = searchParams.get('status')
  const linkStatus = (status?: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status) params.set('status', status)
    else params.delete('status')
    params.delete('page')
    return `${pathname}${params.size ? `?${params.toString()}` : ''}`
  }
  const indicadores = [
    { label: `Total em ${currentYear}`, value: stats.total.toLocaleString("pt-BR"), percentage: 100, percentageLabel: "100%", color: "#1677B8", softColor: "#EAF5FB", icon: <Scale className="h-4 w-4" />, href: linkStatus(), active: !statusAtivo },
    { label: "Em andamento", value: emAndamento.toLocaleString("pt-BR"), percentage: percentual(emAndamento), percentageLabel: `${percentual(emAndamento).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do total`, color: "#A87512", softColor: "#FFF6DE", icon: <CircleDot className="h-4 w-4" />, href: linkStatus('em_andamento'), active: statusAtivo === 'em_andamento' },
    { label: "Homologados", value: homologados.toLocaleString("pt-BR"), percentage: percentual(homologados), percentageLabel: `${percentual(homologados).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do total`, color: "#16845D", softColor: "#E8F6F0", icon: <CheckCircle2 className="h-4 w-4" />, href: linkStatus('homologado'), active: statusAtivo === 'homologado' },
    { label: "Encerrados", value: encerrados.toLocaleString("pt-BR"), percentage: percentual(encerrados), percentageLabel: `${percentual(encerrados).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do total`, color: "#475569", softColor: "#EDF1F5", icon: <FileCheck2 className="h-4 w-4" />, href: linkStatus('encerrado'), active: statusAtivo === 'encerrado' },
  ]
  const titulo = (rotulo: string, Icone: typeof Scale) => <span className="inline-flex items-center gap-1.5"><Icone className="h-3.5 w-3.5 text-gold" aria-hidden="true" />{rotulo}</span>

  return (
    <>
      <ExecutionIndicators title="Panorama das licitações" subtitle={`Processos publicados em ${currentYear}`} items={indicadores} />

      <div className="portal-listing-heading mb-3"><h2 className="text-lg font-bold text-institutional">Licitações encontradas</h2><p className="text-sm text-text-secondary">Processos de contratação no exercício selecionado.</p></div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table licitacoes-table w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo("Processo", Hash)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo("Objeto", FileText)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo("Status", CircleDot)}</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">{titulo("Data de abertura", CalendarDays)}</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">{titulo("Valor", Banknote)}</th>
              </tr>
            </thead>
            <tbody>
              {licitacoes.length > 0 ? licitacoes.map((licitacao) => (
                <tr key={licitacao.id} id={`record-${licitacao.id}`} role="link" tabIndex={0} onClick={(evento) => { if (!(evento.target as HTMLElement).closest("a,button")) router.push(`/licitacoes/${licitacao.id}`) }} onKeyDown={(evento) => { if (evento.key === "Enter") router.push(`/licitacoes/${licitacao.id}`) }} className="cursor-pointer border-b border-slate-200 transition-colors target:border-yellow-400 target:bg-yellow-100 focus:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold">
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-0.5 whitespace-nowrap">
                      <Link href={`/licitacoes/${licitacao.id}`} className="inline-flex items-baseline gap-1 rounded-md border border-amber-100 bg-amber-50 px-2 py-0.5 leading-5 text-amber-700 hover:border-amber-200 hover:no-underline">
                        <span className="text-[9px] font-semibold uppercase tracking-wide opacity-75">Processo:</span>
                        <span className="font-bold">{licitacao.numeroProcesso || referenciaLicitacao(licitacao.numero, licitacao.ano)}</span>
                      </Link>
                      {licitacao.modalidade && <span className={`ml-0.5 rounded border px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.06em] ${corModalidadeLicitacao(licitacao.modalidade)}`}>{licitacao.modalidade}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-md truncate">
                    {licitacao.objeto}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusLicitacao(licitacao.status).cor}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
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
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
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
