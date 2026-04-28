import { Suspense } from "react"
import { HandCoins } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getConveniosPage, getConveniosStats, parsePaginationParams } from "@/lib/site-data"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import { ConveniosContent } from "./convenios-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return {
    title: "Convênios e Transferências | Transparência 360",
    description: "Consulta de convênios, termos de colaboração e transferências de recursos do governo."
  }
}

const statuses = [
  { value: "em_execucao", label: "Em Execução" },
  { value: "encerrado", label: "Encerrado" },
  { value: "rescindido", label: "Rescindido" }
]

const breadcrumbs = [
  { label: "Início", href: "/" },
  { label: "Convênios", href: "/convenios" }
]

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string; page?: string; limit?: string }>
}

async function ConveniosWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = parseInt(params.ano || String(new Date().getFullYear()))
  const [conveniosPage, stats] = await Promise.all([
    getConveniosPage({ ano: currentYear, search: params.q || undefined, status: params.status || undefined, tipo: params.tipo || undefined }, parsePaginationParams(params)),
    getConveniosStats(currentYear)
  ])

  return <ConveniosContent convenios={conveniosPage.data} stats={stats} currentYear={currentYear} pagination={conveniosPage.pagination} />
}

export default function Convenios({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      <DataPageHero
        icon={<HandCoins className="h-6 w-6" />}
        eyebrow="Parcerias e repasses"
        title="Convênios e Transferências"
        description="Consulte convênios, termos de colaboração, termos de fomento e transferências voluntárias com concedente, vigência e valores."
        accent="cyan"
        badges={["Concedente", "Objeto", "Vigência", "Valor total"]}
      />

      <FilterBar page="convenios" years={years} statuses={statuses} searchPlaceholder="Buscar convênios..." />

      <StructuredData 
        type="webpage" 
        data={{ 
          title: "Convênios e Transferências", 
          description: "Consulta de convênios, termos de colaboração e transferências de recursos do governo.",
          url: "/convenios",
          breadcrumbs: [
            { name: "Início", url: "/" },
            { name: "Convênios", url: "/convenios" }
          ]
        }} 
      />

      <Suspense fallback={<PageSkeleton />}>
        <ConveniosWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
