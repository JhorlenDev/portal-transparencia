import { Suspense } from "react"
import { Metadata } from "next"
import { Users } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getServidores, getServidoresStats } from "@/lib/site-data"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { ServidoresContent } from "./servidores-client"

export const dynamic = 'force-dynamic'

const statuses = [
  { value: "efetivo", label: "Efetivo" },
  { value: "temporario", label: "Temporário" },
  { value: "comissionado", label: "Comissionado" }
]

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; vinculo?: string; lotacao?: string }>
}

async function ServidoresWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const [servidores, stats] = await Promise.all([
    getServidores({ anoReferencia: currentYear, search: params.q || undefined, vinculo: params.vinculo || undefined }),
    getServidoresStats(currentYear)
  ])

  return <ServidoresContent servidores={servidores} stats={stats} currentYear={currentYear} />
}

export async function generateMetadata({
  searchParams
}: {
  searchParams: Promise<{ q?: string; ano?: string; vinculo?: string; lotacao?: string }>
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

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: "Início", href: "/" },
          { label: "Servidores Públicos", href: "/servidores" }
        ]}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Users className="h-7 w-7 text-rose-600" />
            Servidores Públicos
          </h1>
          <p className="text-slate-600 mt-1">Quadro de pessoal e remuneração dos servidores municipais.</p>
        </div>
      </div>

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
        statuses={statuses}
        searchPlaceholder="Buscar por nome, matrícula ou cargo..."
      />

      <Suspense fallback={<PageSkeleton />}>
        <ServidoresWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}