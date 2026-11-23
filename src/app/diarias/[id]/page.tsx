import Link from "next/link"
import { notFound } from "next/navigation"
import { FileText } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { Campo, Campos, CartaoValor, Secao, TextoLongo, Voltar, formatarData, formatarMoeda } from "@/components/portal/detalhe"
import { getDiariaDetalhe } from "@/lib/site-data"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

type Diaria = NonNullable<Awaited<ReturnType<typeof getDiariaDetalhe>>>

function titulo(diaria: Diaria): string {
  return `Diária de ${diaria.favorecido}`
}

export async function generateMetadata({ params }: PageProps) {
  const diaria = await getDiariaDetalhe((await params).id)
  if (!diaria) return { title: "Diária não encontrada | Portal da Transparência" }
  return {
    title: `${titulo(diaria)} (${formatarData(diaria.data)}) | Portal da Transparência`,
    description: `${formatarMoeda(diaria.valor)} pagos em diárias a ${diaria.favorecido}${diaria.cargo ? `, ${diaria.cargo}` : ''}.`,
  }
}

export default async function DiariaDetalhe({ params }: PageProps) {
  const diaria = await getDiariaDetalhe((await params).id)
  if (!diaria) notFound()

  const valorPorDiaria = diaria.quantidade ? diaria.valor / diaria.quantidade : null
  const voltar = `/diarias?ano=${diaria.exercicio}`

  return (
    <div className="portal-detail container mx-auto px-4 py-6">
      <StructuredData
        type="webpage"
        data={{
          title: titulo(diaria),
          description: `${titulo(diaria)} - ${formatarMoeda(diaria.valor)}`,
          url: `/diarias/${diaria.id}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Diárias", url: "/diarias" },
            { name: titulo(diaria), url: `/diarias/${diaria.id}` },
          ]
        }}
      />

      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Diárias", href: voltar },
        { label: titulo(diaria) },
      ]} />

      <Voltar href={voltar}>Voltar para as diárias de {diaria.exercicio}</Voltar>

      <Card className="portal-detail-hero relative mb-6 overflow-hidden border-0 bg-institutional text-white shadow-[0_14px_36px_rgba(18,52,91,0.18)]">
        <span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#B42318]/20" aria-hidden />
        <CardContent className="relative p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{diaria.favorecido}</h1>
            <span className="text-sm text-white/60">diária paga em {formatarData(diaria.data)}</span>
          </div>
          {diaria.cargo && <p className="mt-2 text-lg font-semibold text-amber-800">{diaria.cargo}</p>}
          {diaria.cpf && <p className="text-sm text-white/60">CPF {diaria.cpf}</p>}
          <TextoLongo rotulo="Motivo da viagem" texto={diaria.descricao} />
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <CartaoValor
          rotulo="Valor pago"
          valor={diaria.valor}
          cor="border-l-rose-500"
          detalhe={diaria.valorAnulado ? `anulado ${formatarMoeda(Math.abs(diaria.valorAnulado))}` : undefined}
        />
        <Card className="overflow-hidden rounded-xl border border-l-4 border-amber-100 border-l-gold bg-gradient-to-br from-white to-amber-50/50 shadow-[0_4px_14px_rgba(18,52,91,0.06)]">
          <CardContent className="p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-amber-700">Quantidade de diárias</p>
            <p className="mt-0.5 text-xl font-extrabold tracking-tight text-institutional">
              {diaria.quantidade !== null ? diaria.quantidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : 'Não informada'}
            </p>
          </CardContent>
        </Card>
        {valorPorDiaria !== null && (
          <CartaoValor rotulo="Valor por diária" valor={valorPorDiaria} cor="border-l-slate-400" />
        )}
      </div>

      <Secao titulo="Dados do pagamento" icone={<FileText className="h-5 w-5 text-slate-600" aria-hidden />}>
        <Campos>
          <Campo rotulo="Órgão" valor={diaria.orgaoNome} />
          <Campo rotulo="Unidade" valor={diaria.unidadeNome !== diaria.orgaoNome ? diaria.unidadeNome : null} />
          <Campo rotulo="Elemento de despesa" valor={diaria.elementoDespesa} />
          <Campo
            rotulo="Empenho"
            valor={diaria.empenho
              ? <Link href={`/despesas/${diaria.empenho.id}`} className="text-emerald-700 hover:underline">{diaria.empenho.numeroEmpenho}/{diaria.empenho.exercicio}</Link>
              : diaria.numeroEmpenho}
          />
          <Campo rotulo="Total pago no empenho" valor={diaria.empenho ? formatarMoeda(diaria.empenho.valorPago) : null} />
        </Campos>
      </Secao>
    </div>
  )
}
