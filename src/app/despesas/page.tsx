import { Suspense } from "react"
import { DollarSign } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { CompactPageTitle } from "@/components/portal/compact-page-title"
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
  searchParams: Promise<{ q?: string; ano?: string; categoria?: string; status?: string; orgao?: string; credor?: string; ordenar?: string; ordem?: string; fase?: 'empenhado' | 'liquidado' | 'pago' | 'a_liquidar' | 'liquidado_a_pagar'; page?: string; limit?: string }>
}

async function DespesasWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const selectedYear = parseInt(params.ano || String(currentYear))
   
  const baseFilters = {
    exercicio: selectedYear,
    search: params.q || undefined,
    categoria: params.categoria || undefined,
    orgao: params.orgao || undefined,
    credor: params.credor || undefined,
    ordenar: params.ordenar || undefined,
    ordem: params.ordem || undefined,
  }
  const filters = { ...baseFilters, fase: params.fase }

  const [despesasPage, stats] = await Promise.all([
    getDespesasPage(filters, parsePaginationParams(params)),
    getDespesasStats(selectedYear, baseFilters)
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
        activePhase={params.fase}
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
    <div className="portal-page portal-page--despesas container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparencia", href: "/" },
        { label: "Despesas" }
      ]} />

      <FilterBar 
        page="despesas"
        years={years}
        searchPlaceholder="Buscar por credor, objeto, número..."
        leading={<CompactPageTitle icon={<DollarSign className="h-5 w-5" />} title="Despesas Públicas" description="Execução orçamentária municipal" />}
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
