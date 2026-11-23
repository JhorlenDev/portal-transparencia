import { Suspense } from "react"
import { Scale } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { CompactPageTitle } from "@/components/portal/compact-page-title"
import { getDynamicOptions, getLicitacoesPage, getLicitacoesStats, parsePaginationParams } from "@/lib/site-data"
import { STATUS_LICITACAO } from "./status"
import { LicitacoesContent } from "./licitacoes-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Licitações e Contratações ${currentYear} | Portal da Transparência`,
    description: `Consulte todas as licitações, dispensas, inexigibilidades e adesões do município. Dados atualizados de ${currentYear}.`,
    openGraph: {
      title: `Licitações e Contratações ${currentYear} | Portal da Transparência`,
      description: `Consulte todas as licitações, dispensas, inexigibilidades e adesões do município.`,
    }
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; status?: string; modalidade?: string; page?: string; limit?: string }>
}

async function LicitacoesWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))

  const [licitacoesPage, stats] = await Promise.all([
    getLicitacoesPage({ ano: currentYear, search: params.q || undefined, status: params.status || undefined, modalidade: params.modalidade || undefined }, parsePaginationParams(params)),
    getLicitacoesStats(currentYear)
  ])

  return <LicitacoesContent licitacoes={licitacoesPage.data} stats={stats} currentYear={currentYear} pagination={licitacoesPage.pagination} />
}

const statuses = Object.entries(STATUS_LICITACAO)
  .filter(([value]) => value !== "revoked")
  .map(([value, { label }]) => ({ value, label }))

export default async function Licitacoes({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const params = await searchParams
  const modalidades = await getDynamicOptions("licitacoes", "modalidade", parseInt(params.ano || String(currentYear)))
  
  return (
    <div className="portal-page portal-page--licitacoes container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Licitações" }
      ]} />

      <FilterBar 
        page="licitacoes"
        years={years}
        statuses={statuses}
        leading={<CompactPageTitle icon={<Scale className="h-5 w-5" />} title="Licitações" description="Compras e contratações públicas" />}
        extras={modalidades.length > 0 ? [{ param: "modalidade", label: "Modalidade", options: modalidades }] : []}
        searchPlaceholder="Buscar por objeto, número ou processo..."
      />

      <StructuredData 
        type="webpage" 
        data={{
          title: `Licitações e Contratações ${currentYear}`,
          description: `Lista de licitações e contratações do município.`,
          url: `/licitacoes`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Licitações", url: "/licitacoes" }
          ]
        }}
      />

      <Suspense fallback={<PageSkeleton />}>
        <LicitacoesWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
