import { Suspense } from "react"
import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getContratos, getContratosStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Contratos Administrativos ${currentYear} | Portal da Transparência`,
    description: `Consulte todos os contratos administrativos, atas de registro de preços e aditivos do município. Dados atualizados de ${currentYear}.`,
    openGraph: {
      title: `Contratos Administrativos ${currentYear} | Portal da Transparência`,
      description: `Consulte todos os contratos administrativos do município.`,
    }
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2
  }).format(value)
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string }>
}

async function ContratosContent({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))

  const [contratos, stats] = await Promise.all([
    getContratos({ ano: currentYear, search: params.q || undefined, status: params.status || undefined }),
    getContratosStats()
  ])

  return (
    <>
      <StructuredData 
        type="webpage" 
        data={{
          title: `Contratos Administrativos ${currentYear}`,
          description: `Lista de contratos administrativos do município. ${contratos.length} registros encontrados.`,
          url: `/contratos${params.ano ? `?ano=${params.ano}` : ''}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Contratos", url: "/contratos" }
          ]
        }}
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Vigentes</p>
            <p className="text-2xl font-bold text-green-600">{stats.vigentes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Valor Total</p>
            <p className="text-lg font-bold">{formatCurrency(stats.valorTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-500">Encerrados</p>
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
              </tr>
            </thead>
            <tbody>
              {contratos.length > 0 ? contratos.map((contrato) => (
                <tr key={contrato.id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="font-bold text-amber-600">{contrato.numero}/{contrato.ano}</span>
                    <p className="text-xs text-slate-500">{contrato.tipoContrato || '-'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{contrato.contratadoNome}</p>
                    <p className="text-xs text-slate-500">{contrato.contratadoCnpj || '-'}</p>
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
                  <td className="px-4 py-3 text-right font-bold text-emerald-700">
                    {formatCurrency(contrato.valorInicial)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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

const statuses = [
  { value: "vigente", label: "Vigente" },
  { value: "encerrado", label: "Encerrado" }
]

export default async function Contratos({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Contratos" }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="h-7 w-7 text-amber-600" />
            Contratos Administrativos
          </h1>
          <p className="text-slate-600 mt-1">Contratos, atas de registro de preços e aditivos.</p>
        </div>
      </div>

      <FilterBar 
        page="contratos"
        years={years}
        statuses={statuses}
        searchPlaceholder="Buscar por objeto, número..."
      />

      <Suspense fallback={<PageSkeleton />}>
        <ContratosContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}