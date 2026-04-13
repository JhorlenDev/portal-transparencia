"use client"

import React, { Suspense, useState } from "react"
import { DollarSign, TrendingUp, Paperclip, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"

function formatCurrency(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(safeValue)
}

interface Attachment {
  id: string
  nomeArquivo: string
  urlArquivo: string
  tamanho: number | null
  tipoMime: string | null
}

interface DespesaWithAnexos {
  id: string
  numeroEmpenho: string
  dataEmpenho: string | null
  credorNome: string | null
  credorCpfCnpj: string | null
  objeto: string | null
  orgaoNome: string | null
  valorEmpenhado: number | null
  valorLiquidado: number | null
  valorPago: number | null
  anexos: Attachment[]
}

function AttachmentsModal({ 
  anexos, 
  isOpen, 
  onClose 
}: { 
  anexos: Attachment[]
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || anexos.length === 0) return null
  
  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl w-80 max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">Anexos ({anexos.length})</span>
          <button 
            className="text-slate-400 hover:text-slate-600 text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {anexos.map((anexo) => (
            <div key={anexo.id} className="p-3 hover:bg-slate-50 flex items-center justify-between gap-3 border-b border-slate-100 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{anexo.nomeArquivo}</p>
                <p className="text-xs text-slate-500">
                  {anexo.tipoMime} • {anexo.tamanho ? (anexo.tamanho / 1024).toFixed(1) + ' KB' : '-'}
                </p>
              </div>
              <a 
                href={`/api/anexos/${anexo.id}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-md flex items-center gap-1 text-xs font-medium"
              >
                <Eye className="h-4 w-4" />
                Ver
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DespesasTable({ 
  despesas, 
  currentYear 
}: { 
  despesas: DespesaWithAnexos[]
  currentYear: number
}) {
  const [openModal, setOpenModal] = useState<string | null>(null)
  const [modalAnexos, setModalAnexos] = useState<Attachment[]>([])
  
  const handleOpenModal = (despesa: DespesaWithAnexos) => {
    setModalAnexos(despesa.anexos)
    setOpenModal(despesa.id)
  }
  
  return (
    <>
      <AttachmentsModal 
        anexos={modalAnexos}
        isOpen={!!openModal}
        onClose={() => setOpenModal(null)}
      />
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Empenho</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Credor/Fornecedor</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Órgão</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Empenhado</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Liquidado</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Pago</th>
              <th className="text-center px-4 py-3 text-sm font-medium text-slate-600">Anexos</th>
            </tr>
          </thead>
          <tbody>
            {despesas.length > 0 ? despesas.map((despesa) => (
              <tr key={despesa.id} id={`record-${despesa.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                <td className="px-4 py-3">
                  <span className="font-medium">{despesa.numeroEmpenho}</span>
                  <p className="text-xs text-slate-600">
                    {despesa.dataEmpenho ? new Date(despesa.dataEmpenho).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-800">{despesa.credorNome || '-'}</span>
                  <p className="text-xs text-slate-600">{despesa.credorCpfCnpj || '-'}</p>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                  {despesa.objeto || '-'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {despesa.orgaoNome || '-'}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(despesa.valorEmpenhado || 0)}
                </td>
                <td className="px-4 py-3 text-right font-medium text-amber-800">
                  {formatCurrency(despesa.valorLiquidado || 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-800">
                  {formatCurrency(despesa.valorPago || 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  {despesa.anexos && despesa.anexos.length > 0 ? (
                    <button 
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      onClick={() => handleOpenModal(despesa)}
                    >
                      <Paperclip className="h-3 w-3" />
                      {despesa.anexos.length}
                    </button>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
                  Nenhuma despesa encontrada para {currentYear}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

interface Stats {
  empenhado: number
  liquidado: number
  pago: number
}

interface DespesasContentProps {
  despesas: DespesaWithAnexos[]
  stats: Stats
  currentYear: number
  searchParams: { q?: string; ano?: string }
}

function DespesasContent({ despesas, stats, currentYear, searchParams }: DespesasContentProps) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Empenhado</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.empenhado)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Liquidado</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.liquidado)}</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-800" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Pago</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.pago)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <DespesasTable despesas={despesas} currentYear={currentYear} />
        </CardContent>
      </Card>

      <Card className="mt-8 bg-slate-50 border-dashed">
        <CardContent className="p-6">
          <h2 className="font-semibold text-slate-800 mb-2">Sobre os dados de despesas</h2>
          <div className="text-sm text-slate-600 space-y-2">
            <p><strong>Empenho:</strong> Ato que cria a obrigação de pagamento, reservando o crédito orçamentário.</p>
            <p><strong>Liquidação:</strong> Verificação do direito do credor após a prestação do serviço ou entrega do bem.</p>
            <p><strong>Pagamento:</strong> Efetiva transferência de recursos ao credor.</p>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export { DespesasContent, formatCurrency }
export type { DespesaWithAnexos, Stats }
