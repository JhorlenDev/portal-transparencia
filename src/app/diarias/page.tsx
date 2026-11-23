import { Suspense } from "react"
import { Plane } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { CompactPageTitle } from "@/components/portal/compact-page-title"
import { getDiariasOrgaos, getDiariasPage, parsePaginationParams } from "@/lib/site-data"
import { DiariasContent } from "./diarias-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Diárias ${currentYear} | Portal da Transparência`,
    description: `Consulte as diárias pagas a servidores e autoridades do município: favorecido, cargo, destino, quantidade e valor.`,
    openGraph: {
      title: `Diárias ${currentYear} | Portal da Transparência`,
      description: `Consulte as diárias pagas a servidores e autoridades do município.`,
    }
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; orgao?: string; favorecido?: string; page?: string; limit?: string }>
}

async function DiariasWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedYear = parseInt(params.ano || String(new Date().getFullYear()))

  const diariasPage = await getDiariasPage(
    {
      exercicio: selectedYear,
      search: params.q || undefined,
      orgao: params.orgao || undefined,
      favorecido: params.favorecido || undefined,
    },
    parsePaginationParams(params)
  )

  return (
    <>
      <StructuredData
        type="webpage"
        data={{
          title: `Diárias ${selectedYear}`,
          description: `Diárias pagas pelo município. ${diariasPage.pagination.total} pagamentos encontrados.`,
          url: `/diarias${params.ano ? `?ano=${params.ano}` : ''}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Diárias", url: "/diarias" }
          ]
        }}
      />
      <DiariasContent
        diarias={diariasPage.data}
        totais={diariasPage.totais}
        currentYear={selectedYear}
        pagination={diariasPage.pagination}
      />
    </>
  )
}

export default async function Diarias({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const params = await searchParams
  const orgaos = await getDiariasOrgaos(parseInt(params.ano || String(currentYear)))

  return (
    <div className="portal-page portal-page--diarias container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Diárias" }
      ]} />

      <FilterBar
        page="diarias"
        years={years}
        searchPlaceholder="Buscar no motivo ou no nome..."
        leading={<CompactPageTitle icon={<Plane className="h-5 w-5" />} title="Diárias" description="Viagens a serviço do município" />}
        extras={[
          { param: "orgao", label: "Órgão", options: orgaos.map((o) => ({ value: o, label: o })) },
          { param: "favorecido", label: "Favorecido", placeholder: "Favorecido (nome ou cargo)" },
        ]}
      />

      <Suspense fallback={<PageSkeleton />}>
        <DiariasWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
