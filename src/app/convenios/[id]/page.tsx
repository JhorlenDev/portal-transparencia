import { notFound } from "next/navigation"
import { Building2, ExternalLink, HandCoins } from "lucide-react"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { Campo, Campos, CartaoValor, ListaAnexos, Secao, TextoLongo, Voltar, formatarData } from "@/components/portal/detalhe"
import { StructuredData } from "@/components/portal/structured-data"
import { Card, CardContent } from "@/components/ui/card"
import { getConvenioDetalhe } from "@/lib/site-data"

export const dynamic = "force-dynamic"
interface PageProps { params: Promise<{ id: string }> }
export async function generateMetadata({ params }: PageProps) { const item = await getConvenioDetalhe((await params).id); return item ? { title: `Convênio ${item.numero}/${item.ano}`, description: item.objeto.slice(0, 150) } : { title: "Convênio não encontrado" } }
export default async function ConvenioDetalhe({ params }: PageProps) {
  const item = await getConvenioDetalhe((await params).id); if (!item) notFound()
  const percentual = item.valorTotal > 0 ? ((item.valorExecutado || 0) / item.valorTotal) * 100 : 0
  const voltar = `/convenios?ano=${item.ano}`
  return <div className="portal-detail container mx-auto px-4 py-6">
    <StructuredData type="webpage" data={{ title: `Convênio ${item.numero}/${item.ano}`, description: item.objeto, url: `/convenios/${item.id}` }} />
    <Breadcrumbs items={[{ label: "Transparência", href: "/" }, { label: "Convênios", href: voltar }, { label: item.numero }]} /><Voltar href={voltar}>Voltar para os convênios de {item.ano}</Voltar>
    <Card className="relative mb-6 overflow-hidden border-0 bg-institutional text-white shadow-[0_14px_36px_rgba(18,52,91,0.18)]"><span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#0F766E]/20" aria-hidden /><CardContent className="relative p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-extrabold text-white sm:text-3xl">Convênio {item.numero}/{item.ano}</h1><span className="rounded bg-teal-50 px-2 py-0.5 text-xs font-semibold capitalize text-teal-700">{item.status.replaceAll("_", " ")}</span><span className="text-sm text-white/60">{item.tipo}</span></div><p className="mt-3 flex items-center gap-2 text-sm font-semibold text-white"><Building2 className="h-4 w-4" />{item.concedente}</p><TextoLongo rotulo="Objeto" texto={item.objeto} /></CardContent></Card>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><CartaoValor rotulo="Valor total" valor={item.valorTotal} cor="border-l-blue-500" /><CartaoValor rotulo="Repasse" valor={item.valorRepasse} cor="border-l-emerald-500" /><CartaoValor rotulo="Contrapartida" valor={item.valorContrapartida} cor="border-l-amber-500" /><CartaoValor rotulo="Executado" valor={item.valorExecutado} cor="border-l-emerald-500" detalhe={`${percentual.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% do total`} /></div>
    <Secao titulo="Dados do convênio" icone={<HandCoins className="h-4 w-4 text-teal-700" />}><Campos><Campo rotulo="Número do processo" valor={item.numeroProcesso} /><Campo rotulo="Concedente" valor={item.concedente} /><Campo rotulo="CNPJ do concedente" valor={item.concedenteCnpj} /><Campo rotulo="Convenente" valor={item.convenente} /><Campo rotulo="Início da vigência" valor={formatarData(item.dataInicioVigencia)} /><Campo rotulo="Fim da vigência" valor={item.dataFimVigencia ? formatarData(item.dataFimVigencia) : null} /><Campo rotulo="Origem do registro" valor={item.fonte} /><Campo rotulo="Plataforma" valor={item.linkPlataforma ? <a href={item.linkPlataforma} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-digital hover:underline">Acessar <ExternalLink className="h-3.5 w-3.5" /></a> : null} /></Campos></Secao>
    <ListaAnexos anexos={item.anexos} />
  </div>
}
