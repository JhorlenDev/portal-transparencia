import { notFound } from "next/navigation"
import { BadgeCheck, BriefcaseBusiness, CalendarDays, UserRound } from "lucide-react"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { Campo, Campos, CartaoValor, ListaAnexos, Secao, Voltar, formatarData, formatarMoeda } from "@/components/portal/detalhe"
import { StructuredData } from "@/components/portal/structured-data"
import { Card, CardContent } from "@/components/ui/card"
import { getServidorDetalhe } from "@/lib/site-data"

export const dynamic = "force-dynamic"
interface PageProps { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps) {
  const servidor = await getServidorDetalhe((await params).id)
  return servidor ? { title: `${servidor.nome} | Servidores Públicos`, description: `${servidor.cargo} - ${servidor.lotacao || servidor.orgaoNome || "Prefeitura de Tefé"}.` } : { title: "Servidor não encontrado" }
}

export default async function ServidorDetalhe({ params }: PageProps) {
  const servidor = await getServidorDetalhe((await params).id)
  if (!servidor) notFound()
  const referencia = servidor.mesReferencia ? `${String(servidor.mesReferencia).padStart(2, "0")}/${servidor.anoReferencia}` : String(servidor.anoReferencia || "—")
  const descontos = (servidor.impostoRenda || 0) + (servidor.previdencia || 0) + (servidor.outrosDescontos || 0)
  const voltar = `/servidores?ano=${servidor.anoReferencia || new Date().getFullYear()}`
  return <div className="portal-detail container mx-auto px-4 py-6">
    <StructuredData type="webpage" data={{ title: servidor.nome, description: `${servidor.cargo} - ${referencia}`, url: `/servidores/${servidor.id}` }} />
    <Breadcrumbs items={[{ label: "Transparência", href: "/" }, { label: "Servidores", href: voltar }, { label: servidor.nome }]} />
    <Voltar href={voltar}>Voltar para os servidores</Voltar>
    <Card className="relative mb-6 overflow-hidden border-0 bg-institutional text-white shadow-[0_14px_36px_rgba(18,52,91,0.18)]"><span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#5B5FC7]/20" aria-hidden /><CardContent className="relative p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold text-white sm:text-3xl">{servidor.nome}</h1><span className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold capitalize text-indigo-700">{servidor.vinculo}</span></div><div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/60"><span className="flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4" />{servidor.cargo}</span><span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />Referência {referencia}</span></div>{servidor.funcao && <p className="mt-2 text-sm font-semibold text-digital">Função: {servidor.funcao}</p>}</CardContent></Card>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><CartaoValor rotulo="Remuneração base" valor={servidor.remuneracaoBase} cor="border-l-blue-500" /><CartaoValor rotulo="Remuneração bruta" valor={servidor.remuneracaoBruta} cor="border-l-amber-500" /><CartaoValor rotulo="Descontos" valor={descontos} cor="border-l-red-500" /><CartaoValor rotulo="Remuneração líquida" valor={servidor.remuneracaoLiquida} cor="border-l-emerald-500" /></div>
    <Secao titulo="Vínculo e lotação" icone={<UserRound className="h-4 w-4 text-digital" />}><Campos><Campo rotulo="Matrícula" valor={servidor.matricula} /><Campo rotulo="Cargo" valor={servidor.cargo} /><Campo rotulo="Função" valor={servidor.funcao} /><Campo rotulo="Órgão" valor={servidor.orgaoNome} /><Campo rotulo="Lotação" valor={servidor.lotacao} /><Campo rotulo="Carga horária" valor={servidor.cargaHoraria ? `${servidor.cargaHoraria} horas` : null} /><Campo rotulo="Admissão" valor={servidor.dataAdmissao ? formatarData(servidor.dataAdmissao) : null} /><Campo rotulo="Referência" valor={referencia} /></Campos></Secao>
    <Secao titulo="Composição da remuneração" icone={<BadgeCheck className="h-4 w-4 text-amazon" />}><Campos><Campo rotulo="Gratificações" valor={formatarMoeda(servidor.gratificacoes)} /><Campo rotulo="Adicionais" valor={formatarMoeda(servidor.adicionais)} /><Campo rotulo="Indenizações" valor={formatarMoeda(servidor.indenizacoes)} /><Campo rotulo="Imposto de renda" valor={formatarMoeda(servidor.impostoRenda)} /><Campo rotulo="Previdência" valor={formatarMoeda(servidor.previdencia)} /><Campo rotulo="Outros descontos" valor={formatarMoeda(servidor.outrosDescontos)} /><Campo rotulo="Origem do registro" valor={servidor.fonte} /></Campos></Secao>
    <ListaAnexos anexos={servidor.anexos} />
  </div>
}
