import { Suspense } from "react"
import { FileText } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import { getContratosPage, getContratosStats, parsePaginationParams } from "@/lib/site-data"
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
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string; fornecedor?: string; page?: string; limit?: string }>
}

async function ContratosWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))

  const [contratosPage, stats] = await Promise.all([
    getContratosPage({ ano: currentYear, search: params.q || undefined, status: params.status || undefined, tipo: params.tipo || undefined, fornecedor: params.fornecedor || undefined }, parsePaginationParams(params)),
    getContratosStats(currentYear)
  ])

  return <ContratosContent contratos={contratosPage.data} stats={stats} currentYear={currentYear} pagination={contratosPage.pagination} />
}

const statuses = [
  { value: "vigente", label: "Vigente" },
  { value: "encerrado", label: "Encerrado" },
  { value: "anulado", label: "Anulado" }
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

      <DataPageHero
        icon={<FileText className="h-6 w-6" />}
        eyebrow="Execução contratual"
        title="Contratos Administrativos"
        description="Consulte contratos, atas de registro de preços, aditivos e instrumentos similares com contratado, objeto, vigência e valores."
        accent="amber"
        badges={["Contratado", "Vigência", "Valor inicial", "Anexos"]}
      />

      <FilterBar 
        page="contratos"
        years={years}
        statuses={statuses}
        extras={[{ param: "fornecedor", label: "Fornecedor", placeholder: "Fornecedor (nome ou CNPJ)" }]}
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
