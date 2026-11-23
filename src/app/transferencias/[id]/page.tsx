import { notFound } from "next/navigation"
import { ArrowRight, Building2 } from "lucide-react"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { Campo, Campos, CartaoValor, Secao, Voltar, formatarData, formatarMoeda } from "@/components/portal/detalhe"
import { StructuredData } from "@/components/portal/structured-data"
import { Card, CardContent } from "@/components/ui/card"
import { getTransferenciaDetalhe } from "@/lib/site-data"

export const dynamic = "force-dynamic"
interface PageProps { params: Promise<{ id: string }> }
export async function generateMetadata({ params }: PageProps) { const item = await getTransferenciaDetalhe((await params).id); return item ? { title: `Transferência para ${item.entidadeRecebedora}`, description: `${formatarMoeda(item.valorRepasse)} repassados em ${item.exercicio}.` } : { title: "Transferência não encontrada" } }
export default async function TransferenciaDetalhe({ params }: PageProps) {
  const item = await getTransferenciaDetalhe((await params).id); if (!item) notFound()
  const liquido = item.valorRepasse - (item.valorDevolucao || 0); const voltar = `/transferencias?ano=${item.exercicio}`
  return <div className="portal-detail container mx-auto px-4 py-6">
    <StructuredData type="webpage" data={{ title: `Transferência para ${item.entidadeRecebedora}`, description: `${item.entidadePagadora} para ${item.entidadeRecebedora}`, url: `/transferencias/${item.id}` }} />
    <Breadcrumbs items={[{ label: "Transparência", href: "/" }, { label: "Transferências", href: voltar }, { label: item.entidadeRecebedora }]} /><Voltar href={voltar}>Voltar para as transferências de {item.exercicio}</Voltar>
    <Card className="relative mb-6 overflow-hidden border-0 bg-institutional text-white shadow-[0_14px_36px_rgba(18,52,91,0.18)]"><span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#4F46A5]/20" aria-hidden /><CardContent className="relative p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold text-white sm:text-3xl">Transferência entre entidades</h1><span className="text-sm text-white/60">{formatarData(item.data)}</span></div><div className="mt-4 grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]"><div className="rounded-lg bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-500">Origem</p><p className="mt-1 font-bold text-institutional">{item.entidadePagadora}</p></div><ArrowRight className="mx-auto h-5 w-5 text-digital" /><div className="rounded-lg bg-indigo-50 p-3"><p className="text-[10px] font-bold uppercase text-indigo-500">Destino</p><p className="mt-1 font-bold text-institutional">{item.entidadeRecebedora}</p></div></div></CardContent></Card>
    <div className="mb-4 grid gap-3 md:grid-cols-3"><CartaoValor rotulo="Valor repassado" valor={item.valorRepasse} cor="border-l-indigo-500" /><CartaoValor rotulo="Devolução" valor={item.valorDevolucao} cor="border-l-amber-500" /><CartaoValor rotulo="Valor líquido" valor={liquido} cor="border-l-emerald-500" /></div>
    <Secao titulo="Dados da transferência" icone={<Building2 className="h-4 w-4 text-digital" />}><Campos><Campo rotulo="Entidade pagadora" valor={item.entidadePagadora} /><Campo rotulo="CNPJ da pagadora" valor={item.cnpjPagadora} /><Campo rotulo="Entidade recebedora" valor={item.entidadeRecebedora} /><Campo rotulo="CNPJ da recebedora" valor={item.cnpjRecebedora} /><Campo rotulo="Exercício" valor={item.exercicio} /><Campo rotulo="Mês" valor={item.mes ? String(item.mes).padStart(2, "0") : null} /><Campo rotulo="Data" valor={item.data ? formatarData(item.data) : null} /><Campo rotulo="Valor previsto" valor={item.valorPrevisto !== null ? formatarMoeda(item.valorPrevisto) : null} /><Campo rotulo="Origem do registro" valor={item.fonte} /></Campos></Secao>
  </div>
}
