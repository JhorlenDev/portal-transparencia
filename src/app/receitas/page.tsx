import { Suspense } from "react"
import { TrendingUp } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import { getReceitasPage, getReceitasStats, parsePaginationParams } from "@/lib/site-data"
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
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string; page?: string; limit?: string }>
}

async function ReceitasWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))
  
  const filters = {
    exercicio: currentYear,
    search: params.q || undefined,
    categoria: params.categoria || undefined
  }
  
  const [receitasPage, stats] = await Promise.all([
    getReceitasPage(filters, parsePaginationParams(params)),
    getReceitasStats(currentYear)
  ])

  return <ReceitasContent receitas={receitasPage.data} stats={stats} currentYear={currentYear} pagination={receitasPage.pagination} />
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
      
      <DataPageHero
        icon={<TrendingUp className="h-6 w-6" />}
        eyebrow="Arrecadação municipal"
        title="Receitas Públicas"
        description="Acompanhe a previsão e a arrecadação das receitas municipais por natureza, categoria econômica e fonte de recurso."
        accent="blue"
        badges={["Receita prevista", "Receita arrecadada", "Realização", "Dados por ano"]}
      />

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
