import { Suspense } from "react"
import { HandCoins } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { getConvenios, getConveniosStats } from "@/lib/site-data"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
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
  searchParams: Promise<{ q?: string; ano?: string; status?: string; tipo?: string }>
}

async function ConveniosWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const [convenios, stats] = await Promise.all([
    getConvenios({ ano: currentYear, search: params.q || undefined, status: params.status || undefined }),
    getConveniosStats(currentYear)
  ])

  return <ConveniosContent convenios={convenios} stats={stats} currentYear={currentYear} />
}

export default function Convenios({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={breadcrumbs} />
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <HandCoins className="h-7 w-7 text-cyan-600" />
            Convênios e Transferências
          </h1>
          <p className="text-slate-600 mt-1">Convênios, termos de colaboração e transferências de recursos.</p>
        </div>
      </div>

      <FilterBar page="convenios" statuses={statuses} searchPlaceholder="Buscar convênios..." />

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