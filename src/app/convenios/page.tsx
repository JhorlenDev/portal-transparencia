import { Suspense } from "react"
import { HandCoins } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getConvenios, getConveniosStats } from "@/lib/site-data"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { Metadata } from "next"

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Convênios e Transferências | Transparência 360",
    description: "Consulta de convênios, termos de colaboração e transferências de recursos do governo."
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

const statuses = [
  { value: "em_execucao", label: "Em Execução" },
  { value: "encerrado", label: "Encerrado" },
  { value: "rescindido", label: "Rescindido" }
]

const breadcrumbs = [
  { label: "Início", href: "/" },
  { label: "Convênios", href: "/convenios" }
]

async function ConveniosContent({
  searchParams
}: {
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string }>
}) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const [convenios, stats] = await Promise.all([
    getConvenios({ ano: currentYear, search: params.q || undefined, status: params.status || undefined }),
    getConveniosStats(currentYear)
  ])

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
              </tr>
            </thead>
            <tbody>
              {convenios.length > 0 ? convenios.map((conv) => (
                <tr key={conv.id} className="border-b border-slate-200 hover:bg-slate-50">
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
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
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

export default function Convenios({
  searchParams
}: {
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string }>
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <HandCoins className="h-7 w-7 text-cyan-600" />
            Convênios e Transferências
          </h1>
          <p className="text-slate-600 mt-1">Convênios, termos de colaboração e transferências de recursos.</p>
        </div>
      </div>

      <FilterBar page="convenios" statuses={statuses} searchPlaceholder="Buscar convênios..." />

      <Suspense fallback={<PageSkeleton />}>
        <ConveniosContent searchParams={searchParams} />
      </Suspense>

      <StructuredData type="webpage" data={{ title: "Convênios e Transferências", description: "Consulta de convênios, termos de colaboração e transferências de recursos do governo." }} />
    </div>
  )
}
