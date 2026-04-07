import { Suspense } from "react"
import { FileText } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { getContratos, getContratosStats } from "@/lib/site-data"
import { ContratosContent } from "./contratos-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Contratos Administrativos ${currentYear} | Portal da Transparência`,
    description: `Consulte todos os contratos administrativos, atas de registro de preços e aditivos do município. Dados atualizados de ${currentYear}.`,
    openGraph: {
      title: `Contratos Administrativos ${currentYear} | Portal da Transparência`,
      description: `Consulte todos os contratos administrativos do município.`,
    }
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string }>
}

async function ContratosWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))

  const [contratos, stats] = await Promise.all([
    getContratos({ ano: currentYear, search: params.q || undefined, status: params.status || undefined }),
    getContratosStats()
  ])

  return <ContratosContent contratos={contratos} stats={stats} currentYear={currentYear} />
}

const statuses = [
  { value: "vigente", label: "Vigente" },
  { value: "encerrado", label: "Encerrado" }
]

export default async function Contratos({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Contratos" }
      ]} />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <FileText className="h-7 w-7 text-amber-800" />
            Contratos Administrativos
          </h1>
          <p className="text-slate-600 mt-1">Contratos, atas de registro de preços e aditivos.</p>
        </div>
      </div>

      <FilterBar 
        page="contratos"
        years={years}
        statuses={statuses}
        searchPlaceholder="Buscar por objeto, número..."
      />

      <StructuredData 
        type="webpage" 
        data={{
          title: `Contratos Administrativos ${currentYear}`,
          description: `Lista de contratos administrativos do município.`,
          url: `/contratos`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Contratos", url: "/contratos" }
          ]
        }}
      />

      <Suspense fallback={<PageSkeleton />}>
        <ContratosWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}