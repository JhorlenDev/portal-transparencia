"use client"

import React from "react"
import Link from "next/link"
import { Banknote, CalendarDays, Users } from "lucide-react"
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
  mesReferencia?: number | null
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
  const router = useRouter()
  const indicadores = [
    { label: 'Servidores', value: stats.total.toLocaleString('pt-BR'), percentage: 100, percentageLabel: 'registros', color: '#5B5FC7', softColor: '#F0F0FC', icon: <Users className="h-4 w-4" /> },
    { label: 'Folha bruta', value: formatCurrency(stats.totalRemuneracao), percentage: 100, percentageLabel: 'no período', color: '#16845D', softColor: '#E8F6F0', icon: <Banknote className="h-4 w-4" /> },
    { label: 'Referência', value: String(currentYear || '—'), percentage: 100, percentageLabel: 'exercício', color: '#1677B8', softColor: '#EAF5FB', icon: <CalendarDays className="h-4 w-4" /> },
  ]
  return (
    <>
      <ExecutionIndicators title="Panorama dos servidores" subtitle="Quadro e remuneração municipal" items={indicadores} />

      <div className="portal-listing-heading mb-3"><h2 className="text-lg font-bold text-institutional">Servidores encontrados</h2><p className="text-sm text-text-secondary">Quadro de pessoal no período selecionado.</p></div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="portal-listing-scroll overflow-x-auto">
            <table className="portal-data-table compact-public-table w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Cargo/Função</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Lotação</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Vínculo</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Referência</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Rem. Bruta</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Rem. Líquida</th>
              </tr>
            </thead>
            <tbody>
              {servidores.length > 0 ? servidores.map((servidor) => (
                <tr key={servidor.id} id={`record-${servidor.id}`} role="link" tabIndex={0} onClick={(evento) => { if (!(evento.target as HTMLElement).closest("a,button")) router.push(`/servidores/${servidor.id}`) }} onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") router.push(`/servidores/${servidor.id}`) }} className="cursor-pointer border-b border-slate-200 transition-colors target:border-yellow-400 target:bg-yellow-100 focus:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                  <td className="px-4 py-3">
                    <Link href={`/servidores/${servidor.id}`} className="font-medium text-institutional hover:text-digital hover:underline">{servidor.nome}</Link>
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
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                    {servidor.mesReferencia ? `${String(servidor.mesReferencia).padStart(2, '0')}/${servidor.anoReferencia || currentYear}` : servidor.anoReferencia || currentYear}
                  </td>
                  <td className="px-4 py-3 text-left font-medium">
                    {formatCurrency(servidor.remuneracaoBruta || 0)}
                  </td>
                  <td className="px-4 py-3 text-left font-bold text-emerald-800">
                    {formatCurrency(servidor.remuneracaoLiquida || 0)}
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
