import { Suspense } from "react"
import { TrendingUp } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getReceitas, getReceitasStats } from "@/lib/site-data"
import { ReceitasContent } from "./receitas-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Receitas Públicas ${currentYear} | Portal da Transparência`,
    description: `Consulte a previsão e arrecadação das receitas municipais. Dados atualizados de ${currentYear}.`,
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string }>
}

async function ReceitasWrapper({ searchParams }: PageProps) {
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

  return <ReceitasContent receitas={receitas} stats={stats} currentYear={currentYear} />
}

export default async function Receitas({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

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

      <StructuredData 
        type="webpage" 
        data={{
          title: `Receitas Públicas ${currentYear} | Portal da Transparência`,
          description: `Consulte a previsão e arrecadação das receitas municipais.`,
          url: '/receitas',
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Receitas", url: "/receitas" }
          ]
        }}
      />

      <Suspense fallback={<PageSkeleton />}>
        <ReceitasWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}