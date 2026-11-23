import { Suspense } from "react"
import { TrendingUp } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getReceitasPage, getReceitasTipos, getReceitasStats, parsePaginationParams } from "@/lib/site-data"
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
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string; tipo?: string; ordenar?: string; ordem?: string; fase?: 'previsto' | 'arrecadado' | 'excesso' | 'a_arrecadar'; page?: string; limit?: string }>
}

async function ReceitasWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))
  
  const filters = {
    exercicio: currentYear,
    search: params.q || undefined,
    categoria: params.categoria || undefined,
    tipo: params.tipo || undefined,
    ordenar: params.ordenar || undefined,
    ordem: params.ordem || undefined,
    fase: params.fase,
  }
  
  const [receitasPage, stats] = await Promise.all([
    getReceitasPage(filters, parsePaginationParams(params)),
    getReceitasStats(currentYear, filters.tipo)
  ])

  return <ReceitasContent receitas={receitasPage.data} stats={stats} currentYear={currentYear} activePhase={params.fase} pagination={receitasPage.pagination} />
}

// Receita orcamentaria e o padrao (sem o filtro); Uniao e Estado sao recortes das transferencias.
const NOMES_TIPOS: Record<string, string> = {
  uniao: "Transferências da União",
  estado: "Transferências do Estado",
}

export default async function Receitas({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const params = await searchParams
  const tipos = (await getReceitasTipos(parseInt(params.ano || String(currentYear)))).filter((t) => t in NOMES_TIPOS)

  return (
    <div className="portal-page portal-page--receitas container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Receitas" }
      ]} />
      
      <FilterBar
        page="receitas"
        years={years}
        searchPlaceholder="Buscar por natureza, código..."
        leading={
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-amazon" aria-hidden="true">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="whitespace-nowrap text-base font-extrabold text-institutional">Receitas Públicas</h1>
              <p className="hidden whitespace-nowrap text-xs text-text-secondary xl:block">Previsão e arrecadação municipal</p>
            </div>
          </div>
        }
        extras={tipos.length > 0 ? [
          { param: "tipo", label: "Receita orçamentária", options: tipos.map((t) => ({ value: t, label: NOMES_TIPOS[t] })) },
        ] : []}
      />

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
