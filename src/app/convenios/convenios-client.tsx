"use client"

import React from "react"
import Link from "next/link"
import { Banknote, CalendarClock, HandCoins } from "lucide-react"
import { usePathname, useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
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
  emExecucao: number
  valorTotal: number
}

interface ConveniosContentProps {
  convenios: ConvenioWithAnexos[]
  stats: Stats
  currentYear: number
  pagination?: PaginationMeta
}

export function ConveniosContent({ convenios, stats, currentYear, pagination }: ConveniosContentProps) {
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
  const indicadores = [
    { label: `Total em ${currentYear}`, value: stats.total.toLocaleString('pt-BR'), percentage: 100, percentageLabel: '100%', color: '#0F766E', softColor: '#E8F6F4', icon: <HandCoins className="h-4 w-4" />, href: linkStatus(), active: !statusAtivo },
    { label: 'Em execução', value: stats.emExecucao.toLocaleString('pt-BR'), percentage: stats.total > 0 ? stats.emExecucao / stats.total * 100 : 0, percentageLabel: `${(stats.total > 0 ? stats.emExecucao / stats.total * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% do total`, color: '#1677B8', softColor: '#EAF5FB', icon: <CalendarClock className="h-4 w-4" />, href: linkStatus('em_execucao'), active: statusAtivo === 'em_execucao' },
    { label: 'Valor total', value: formatCurrency(stats.valorTotal), percentage: 100, percentageLabel: 'conveniado', color: '#16845D', softColor: '#E8F6F0', icon: <Banknote className="h-4 w-4" />, href: linkStatus(), active: false },
  ]
  return (
    <>
      <ExecutionIndicators title="Panorama dos convênios" subtitle={`Parcerias e repasses de ${currentYear}`} items={indicadores} />

      <div className="portal-listing-heading mb-3"><h2 className="text-lg font-bold text-institutional">Convênios encontrados</h2><p className="text-sm text-text-secondary">Parcerias e repasses no exercício selecionado.</p></div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table compact-public-table w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nº/Ano</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Concedente</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vigência</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {convenios.length > 0 ? convenios.map((conv) => (
                <tr key={conv.id} id={`record-${conv.id}`} role="link" tabIndex={0} onClick={(evento) => { if (!(evento.target as HTMLElement).closest("a,button")) router.push(`/convenios/${conv.id}`) }} onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") router.push(`/convenios/${conv.id}`) }} className="cursor-pointer border-b border-slate-200 transition-colors target:border-yellow-400 target:bg-yellow-100 focus:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500">
                  <td className="px-4 py-3">
                    <Link href={`/convenios/${conv.id}`} className="font-bold text-cyan-600 hover:underline">{conv.numero}/{conv.ano}</Link>
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
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                    <span>{conv.dataInicioVigencia ? new Date(conv.dataInicioVigencia).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' }) : '—'}</span>
                    {conv.dataFimVigencia && <p className="text-[10px] text-slate-500">até {new Date(conv.dataFimVigencia).toLocaleDateString('pt-BR', { timeZone: 'America/Manaus' })}</p>}
                  </td>
                  <td className="px-4 py-3 text-left font-bold text-emerald-800">
                    {formatCurrency(conv.valorTotal)}
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

      {pagination && <PaginationControls pagination={pagination} />}
    </>
  )
}

export type { ConvenioWithAnexos, Stats }
