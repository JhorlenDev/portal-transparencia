import { Suspense } from "react"
import { Scale } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getLicitacoes, getLicitacoesStats } from "@/lib/site-data"
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
  searchParams: Promise<{ q?: string; ano?: string; status?: string; modalidade?: string }>
}

async function LicitacoesWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))

  const [licitacoes, stats] = await Promise.all([
    getLicitacoes({ ano: currentYear, search: params.q || undefined, status: params.status || undefined }),
    getLicitacoesStats(currentYear)
  ])

  return <LicitacoesContent licitacoes={licitacoes} stats={stats} currentYear={currentYear} />
}

const statuses = [
  { value: "planejamento", label: "Planejamento" },
  { value: "publicado", label: "Publicado" },
  { value: "em_andamento", label: "Em Andamento" },
  { value: "homologado", label: "Homologado" }
]

export default async function Licitacoes({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Licitações" }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Scale className="h-7 w-7 text-purple-600" />
            Licitações e Contratações
          </h1>
          <p className="text-slate-600 mt-1">
            Processos licitatórios, dispensas, inexigibilidades e adesões.
          </p>
        </div>
      </div>

      <FilterBar 
        page="licitacoes"
        years={years}
        statuses={statuses}
        searchPlaceholder="Buscar por objeto, número..."
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