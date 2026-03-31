import { Suspense } from "react"
import { TrendingUp, ArrowUpRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getReceitas, getReceitasStats } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Receitas Públicas ${currentYear} | Portal da Transparência`,
    description: `Consulte a previsão e arrecadação das receitas municipais. Dados atualizados de ${currentYear}.`,
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
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string }>
}

async function ReceitasContent({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))
  
  const filters = {
    exercicio: currentYear,
    search: params.q || undefined,
    categoria: params.categoria || undefined
  }
  
  const [receitas, stats] = await Promise.all([
    getReceitas(filters),
    getReceitasStats(currentYear)
  ])

  const realizacao = stats.previsto > 0 
    ? ((stats.arrecadado / stats.previsto) * 100).toFixed(1) 
    : '0'

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Previsão Total ({currentYear})</p>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(stats.previsto)}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Arrecadado</p>
                <p className="text-2xl font-bold text-emerald-800">{formatCurrency(stats.arrecadado)}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-emerald-800" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Realização</p>
                <p className="text-2xl font-bold text-amber-800">{realizacao}%</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-amber-800" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <CardContent className="p-0 min-w-0">
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Código</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Natureza da Receita</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Categoria</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Previsto</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Arrecadado</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">% Realizado</th>
              </tr>
            </thead>
            <tbody>
              {receitas.length > 0 ? receitas.map((receita) => {
                const percentual = receita.valorPrevisto > 0 
                  ? ((receita.valorArrecadado || 0) / receita.valorPrevisto) * 100 
                  : 0
                return (
                  <tr key={receita.id} id={`record-${receita.id}`} className="border-b border-slate-200 hover:bg-slate-50 transition-colors target:bg-yellow-100 target:border-yellow-400">
                    <td className="px-4 py-3 font-mono text-sm">{receita.codigoNatureza}</td>
                    <td className="px-4 py-3 font-medium">{receita.naturezaReceita}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded text-xs">
                        {receita.categoriaEconomica}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-600">
                      {formatCurrency(receita.valorPrevisto)}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-800">
                      {formatCurrency(receita.valorArrecadado || 0)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 rounded-full" 
                            style={{ width: `${Math.min(percentual, 100)}%` }} 
                          />
                        </div>
                        <span className="text-sm font-medium">{percentual.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                    Nenhuma receita encontrada para {currentYear}
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

export default async function Receitas({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const webpageData = {
    title: `Receitas Públicas ${currentYear} | Portal da Transparência`,
    description: `Consulte a previsão e arrecadação das receitas municipais. Dados atualizados de ${currentYear}.`,
    url: '/receitas'
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Receitas" }
      ]} />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <TrendingUp className="h-7 w-7 text-blue-600" />
            Receitas Públicas
          </h1>
          <p className="text-slate-600 mt-1">
            Acompanhe a previsão e arrecadação das receitas municipais.
          </p>
        </div>
      </div>

      <FilterBar page="receitas" years={years} searchPlaceholder="Buscar por natureza, código..." />

      <StructuredData type="webpage" data={webpageData} />

      <Suspense fallback={<PageSkeleton />}>
        <ReceitasContent searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
