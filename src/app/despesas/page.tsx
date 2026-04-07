import { Suspense } from "react"
import { DollarSign } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getDespesas, getDespesasStats } from "@/lib/site-data"
import { DespesasContent, formatCurrency } from "./despesas-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Despesas Públicas ${currentYear} | Portal da Transparência`,
    description: `Consulte todas as despesas, empenhos, liquidações e pagamentos do município. Dados atualizados de ${currentYear}.`,
    openGraph: {
      title: `Despesas Públicas ${currentYear} | Portal da Transparência`,
      description: `Consulte todas as despesas, empenhos, liquidações e pagamentos do município.`,
    }
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string; status?: string }>
}

export default async function Despesas({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  const filters = {
    exercicio: parseInt(params.ano || String(currentYear)),
    search: params.q || undefined,
    categoria: params.categoria || undefined
  }

  const [despesas, stats] = await Promise.all([
    getDespesas(filters),
    getDespesasStats(parseInt(params.ano || String(currentYear)))
  ])

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparencia", href: "/" },
        { label: "Despesas" }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-emerald-800" />
            Despesas Publicas
          </h1>
          <p className="text-slate-600 mt-1">
            Consulte empenhos, liquidacoes e pagamentos realizados pelo municipio.
          </p>
        </div>
      </div>

      <FilterBar 
        page="despesas"
        years={years}
        searchPlaceholder="Buscar por credor, objeto, número..."
      />

      <Suspense fallback={<PageSkeleton />}>
        <StructuredData 
          type="webpage" 
          data={{
            title: `Despesas Públicas ${currentYear}`,
            description: `Lista de despesas públicas do município. ${despesas.length} registros encontrados.`,
            url: `/despesas${params.ano ? `?ano=${params.ano}` : ''}`,
            breadcrumbs: [
              { name: "Home", url: "/" },
              { name: "Despesas", url: "/despesas" }
            ]
          }}
        />
        <DespesasContent 
          despesas={despesas as any} 
          stats={stats as any} 
          currentYear={parseInt(params.ano || String(currentYear))}
          searchParams={params}
        />
      </Suspense>
    </div>
  )
}