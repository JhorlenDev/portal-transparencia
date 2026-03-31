import { Suspense } from "react"
import { Scale } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getLicitacoes, getLicitacoesStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    planejamento: 'bg-slate-100 text-slate-700',
    publicado: 'bg-blue-100 text-blue-700',
    em_andamento: 'bg-amber-100 text-amber-700',
    homologado: 'bg-green-100 text-green-700',
    revoked: 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-slate-100 text-slate-700'
}

async function LicitacoesContent() {
  const currentYear = new Date().getFullYear()
  const [licitacoes, stats] = await Promise.all([
    getLicitacoes(currentYear),
    getLicitacoesStats(currentYear)
  ])

  const emAndamento = stats.porStatus.find((s: any) => s.status === 'em_andamento')?._count || 0
  const homologados = stats.porStatus.find((s: any) => s.status === 'homologado')?._count || 0

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total em {currentYear}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Em andamento</p>
            <p className="text-2xl font-bold text-blue-600">{emAndamento}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Homologados</p>
            <p className="text-2xl font-bold text-green-600">{homologados}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Processos</p>
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
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Objeto</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Abertura</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Valor</th>
              </tr>
            </thead>
            <tbody>
              {licitacoes.length > 0 ? licitacoes.map((licitacao) => (
                <tr key={licitacao.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-bold text-purple-600">{licitacao.numero}/{licitacao.ano}</span>
                    <p className="text-xs text-slate-500">{licitacao.modalidade}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-md truncate">
                    {licitacao.objeto}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(licitacao.status)}`}>
                      {licitacao.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {licitacao.dataAbertura 
                      ? new Date(licitacao.dataAbertura).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(licitacao.valorEstimado || 0)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Nenhuma licitação encontrada para {currentYear}
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

export default function Licitacoes() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Scale className="h-7 w-7 text-purple-600" />
            Licitações e Contratações
          </h1>
          <p className="text-slate-600 mt-1">
            Processos licitatórios, dispensas, inexigibilidades e adesões.
          </p>
        </div>
      </div>

      <Suspense fallback={<PageSkeleton />}>
        <LicitacoesContent />
      </Suspense>
    </div>
  )
}
