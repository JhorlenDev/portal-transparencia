import { Suspense } from "react"
import { DollarSign } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import { getDespesasOrgaos, getDespesasPage, getDespesasStats, parsePaginationParams } from "@/lib/site-data"
import { DespesasContent } from "./despesas-client"

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
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string; status?: string; orgao?: string; credor?: string; page?: string; limit?: string }>
}

async function DespesasWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const selectedYear = parseInt(params.ano || String(currentYear))
   
  const filters = {
    exercicio: selectedYear,
    search: params.q || undefined,
    categoria: params.categoria || undefined,
    orgao: params.orgao || undefined,
    credor: params.credor || undefined,
  }

  const [despesasPage, stats] = await Promise.all([
    getDespesasPage(filters, parsePaginationParams(params)),
    getDespesasStats(selectedYear, filters)
  ])

  return (
    <>
      <StructuredData 
        type="webpage" 
        data={{
          title: `Despesas Públicas ${selectedYear}`,
          description: `Lista de despesas públicas do município. ${despesasPage.pagination.total} registros encontrados.`,
          url: `/despesas${params.ano ? `?ano=${params.ano}` : ''}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Despesas", url: "/despesas" }
          ]
        }}
      />
      <DespesasContent 
        despesas={despesasPage.data} 
        stats={stats} 
        currentYear={selectedYear}
        pagination={despesasPage.pagination}
      />
    </>
  )
}

export default async function Despesas({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const params = await searchParams
  const orgaos = await getDespesasOrgaos(parseInt(params.ano || String(currentYear)))

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparencia", href: "/" },
        { label: "Despesas" }
      ]} />

      <DataPageHero
        icon={<DollarSign className="h-6 w-6" />}
        eyebrow="Execução orçamentária"
        title="Despesas Públicas"
        description="Consulte empenhos, liquidações e pagamentos realizados pelo município, com filtros por ano e busca direta por credor, objeto ou número do empenho."
        accent="emerald"
        badges={["Empenhos", "Liquidações", "Pagamentos", "Anexos oficiais"]}
      />

      <FilterBar 
        page="despesas"
        years={years}
        searchPlaceholder="Buscar por credor, objeto, número..."
        extras={[
          { param: "orgao", label: "Órgão", options: orgaos.map((o) => ({ value: o, label: o })) },
          { param: "credor", label: "Credor", placeholder: "Credor (nome ou CPF/CNPJ)" },
        ]}
      />

      <Suspense fallback={<PageSkeleton />}>
        <DespesasWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
