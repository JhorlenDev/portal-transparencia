import { Suspense } from "react"
import { Metadata } from "next"
import { Users } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getServidoresPage, getServidoresStats, parsePaginationParams } from "@/lib/site-data"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import { ServidoresContent } from "./servidores-client"

export const dynamic = 'force-dynamic'

const statuses = [
  { value: "efetivo", label: "Efetivo" },
  { value: "temporario", label: "Temporário" },
  { value: "comissionado", label: "Comissionado" }
]

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; vinculo?: string; lotacao?: string; page?: string; limit?: string }>
}

async function ServidoresWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))
  const [servidoresPage, stats] = await Promise.all([
    getServidoresPage({ anoReferencia: currentYear, search: params.q || undefined, vinculo: params.vinculo || undefined, lotacao: params.lotacao || undefined }, parsePaginationParams(params)),
    getServidoresStats(currentYear)
  ])

  return <ServidoresContent servidores={servidoresPage.data} stats={stats} currentYear={currentYear} pagination={servidoresPage.pagination} />
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ q?: string; ano?: string; vinculo?: string; lotacao?: string; page?: string; limit?: string }>
}): Promise<Metadata> {
  const params = await searchParams
  const baseTitle = "Servidores Públicos"
  const title = params.q || params.vinculo ? `${baseTitle} - Busca` : baseTitle

  return {
    title,
    description: "Quadro de pessoal e remuneração dos servidores municipais. Transparência360 - Portal de Transparência Pública.",
  }
}

export default function Servidores({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Servidores Públicos", href: "/servidores" }
        ]}
      />

      <DataPageHero
        icon={<Users className="h-6 w-6" />}
        eyebrow="Quadro de pessoal"
        title="Servidores Públicos"
        description="Consulte servidores municipais por ano, vínculo, nome, matrícula ou cargo, com lotação e remuneração informadas em transparência ativa."
        accent="rose"
        badges={["Nome e matrícula", "Cargo", "Lotação", "Remuneração"]}
      />

      <StructuredData
        type="webpage"
        data={{
          title: "Servidores Públicos",
          description: "Quadro de pessoal e remuneração dos servidores municipais.",
          url: "/servidores",
          breadcrumbs: [
            { name: "Início", url: "/" },
            { name: "Servidores Públicos", url: "/servidores" }
          ]
        }}
      />

      <FilterBar
        page="servidores"
        years={years}
        statuses={statuses}
        searchPlaceholder="Buscar por nome, matrícula ou cargo..."
      />

      <Suspense fallback={<PageSkeleton />}>
        <ServidoresWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
