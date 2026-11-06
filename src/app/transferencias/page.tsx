import { Suspense } from "react"
import { ArrowLeftRight } from "lucide-react"
import { PageSkeleton } from "@/components/ui/skeletons"
import { FilterBar } from "@/components/portal/filter-bar"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { DataPageHero } from "@/components/portal/data-page-hero"
import { getTransferenciasPage, getTransferenciasPorRecebedora, parsePaginationParams } from "@/lib/site-data"
import { TransferenciasContent } from "./transferencias-client"

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const currentYear = new Date().getFullYear()
  return {
    title: `Transferências entre Entidades ${currentYear} | Portal da Transparência`,
    description: `Consulte os repasses financeiros entre a Prefeitura e os fundos e entidades do município.`,
    openGraph: {
      title: `Transferências entre Entidades ${currentYear} | Portal da Transparência`,
      description: `Consulte os repasses financeiros entre a Prefeitura e os fundos e entidades do município.`,
    }
  }
}

interface PageProps {
  searchParams: Promise<{ q?: string; ano?: string; mes?: string; page?: string; limit?: string }>
}

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

async function TransferenciasWrapper({ searchParams }: PageProps) {
  const params = await searchParams
  const selectedYear = parseInt(params.ano || String(new Date().getFullYear()))
  const mes = parseInt(params.mes || "")
  const filters = {
    exercicio: selectedYear,
    mes: Number.isInteger(mes) ? mes : undefined,
    entidade: params.q || undefined,
  }

  const [transferenciasPage, porRecebedora] = await Promise.all([
    getTransferenciasPage(filters, parsePaginationParams(params)),
    getTransferenciasPorRecebedora(filters),
  ])

  return (
    <>
      <StructuredData
        type="webpage"
        data={{
          title: `Transferências entre Entidades ${selectedYear}`,
          description: `Repasses financeiros entre entidades do município. ${transferenciasPage.pagination.total} lançamentos encontrados.`,
          url: `/transferencias${params.ano ? `?ano=${params.ano}` : ''}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Transferências", url: "/transferencias" }
          ]
        }}
      />
      <TransferenciasContent
        transferencias={transferenciasPage.data}
        totais={transferenciasPage.totais}
        porRecebedora={porRecebedora}
        periodo={filters.mes ? `${MESES[filters.mes - 1]} de ${selectedYear}` : String(selectedYear)}
        pagination={transferenciasPage.pagination}
      />
    </>
  )
}

export default async function Transferencias({ searchParams }: PageProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Transferências" }
      ]} />

      <DataPageHero
        icon={<ArrowLeftRight className="h-6 w-6" />}
        eyebrow="Repasses intragovernamentais"
        title="Transferências entre Entidades"
        description="Acompanhe os repasses financeiros entre a Prefeitura e os fundos municipais (Educação, Saúde, Assistência Social e outros), com data, valor e devoluções."
        accent="indigo"
        badges={["Entidade pagadora", "Entidade recebedora", "Repasse", "Devolução"]}
      />

      <FilterBar
        page="transferencias"
        years={years}
        searchPlaceholder="Buscar entidade (nome ou CNPJ)..."
        extras={[
          { param: "mes", label: "Mês", options: MESES.map((nome, i) => ({ value: String(i + 1), label: nome })) },
        ]}
      />

      <Suspense fallback={<PageSkeleton />}>
        <TransferenciasWrapper searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
