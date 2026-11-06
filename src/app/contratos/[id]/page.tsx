import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarClock, Info, Receipt, Scale } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { Campo, Campos, CartaoValor, ListaAnexos, Secao, TabelaEmpenhos, TextoLongo, Voltar, formatarData, formatarMoeda } from "@/components/portal/detalhe"
import { getContratoDetalhe } from "@/lib/site-data"
import { limparTexto, parseMoney } from "@/lib/fiorilli/parse"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

type Contrato = NonNullable<Awaited<ReturnType<typeof getContratoDetalhe>>>

const CORES_STATUS: Record<string, string> = {
  vigente: 'bg-green-100 text-green-700',
  encerrado: 'bg-slate-100 text-slate-700',
  anulado: 'bg-red-100 text-red-700',
}

function titulo(contrato: Contrato): string {
  return `Contrato ${contrato.numero.includes('/') ? contrato.numero : `${contrato.numero}/${contrato.ano}`}`
}

export async function generateMetadata({ params }: PageProps) {
  const contrato = await getContratoDetalhe((await params).id)
  if (!contrato) return { title: "Contrato não encontrado | Portal da Transparência" }
  return {
    title: `${titulo(contrato)} - ${contrato.contratadoNome} | Portal da Transparência`,
    description: `${titulo(contrato)} com ${contrato.contratadoNome}: ${contrato.objeto.slice(0, 150)}`,
  }
}

export default async function ContratoDetalhe({ params }: PageProps) {
  const contrato = await getContratoDetalhe((await params).id)
  if (!contrato) notFound()

  const fiorilli = contrato.fonte === 'fiorilli'
  const payload = (contrato.payload ?? {}) as Record<string, string | null>
  const aditado = contrato.valorAditado ?? 0
  const valorAtual = contrato.valorAtual ?? contrato.valorInicial
  const saldoEmpenhar = fiorilli ? parseMoney(payload.SALDOEMPENHAR) : null
  const saldoLiquidar = fiorilli ? parseMoney(payload.SALDOLIQUIDAR) : null
  const voltar = `/contratos?ano=${contrato.ano}`

  return (
    <div className="container mx-auto px-4 py-8">
      <StructuredData
        type="webpage"
        data={{
          title: titulo(contrato),
          description: `${titulo(contrato)} - ${contrato.contratadoNome}`,
          url: `/contratos/${contrato.id}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Contratos", url: "/contratos" },
            { name: titulo(contrato), url: `/contratos/${contrato.id}` },
          ]
        }}
      />

      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Contratos", href: voltar },
        { label: titulo(contrato) },
      ]} />

      <Voltar href={voltar}>Voltar para os contratos de {contrato.ano}</Voltar>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{titulo(contrato)}</h1>
            <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${CORES_STATUS[contrato.status] ?? 'bg-slate-100 text-slate-700'}`}>
              {contrato.status}
            </span>
            {(contrato.modalidade || contrato.tipoContrato) && (
              <span className="text-sm text-slate-500">{contrato.modalidade || contrato.tipoContrato}</span>
            )}
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-800">{contrato.contratadoNome}</p>
          {contrato.contratadoCnpj && <p className="text-sm text-slate-600">CNPJ/CPF {contrato.contratadoCnpj}</p>}
          <TextoLongo rotulo="Objeto" texto={contrato.objeto} />
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <CartaoValor rotulo="Valor inicial" valor={contrato.valorInicial} cor="border-l-amber-500" />
        <CartaoValor rotulo="Aditivos" valor={aditado} cor="border-l-slate-400" detalhe={aditado ? undefined : 'nenhum aditivo de valor'} />
        <CartaoValor
          rotulo="Valor atual"
          valor={valorAtual}
          cor="border-l-emerald-500"
          detalhe={aditado && contrato.valorInicial ? `${((aditado / contrato.valorInicial) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% sobre o inicial` : undefined}
        />
      </div>

      <Secao titulo="Vigência e execução" icone={<CalendarClock className="h-5 w-5 text-slate-600" aria-hidden />}>
        <Campos>
          <Campo rotulo="Assinatura" valor={contrato.dataAssinatura ? formatarData(contrato.dataAssinatura) : null} />
          <Campo rotulo="Publicação" valor={contrato.dataPublicacao ? formatarData(contrato.dataPublicacao) : null} />
          <Campo rotulo="Início da vigência" valor={formatarData(contrato.dataInicioVigencia)} />
          <Campo rotulo="Fim da vigência" valor={contrato.dataFimVigencia ? formatarData(contrato.dataFimVigencia) : null} />
          <Campo rotulo="Fundamento legal" valor={fiorilli ? limparTexto(payload.FUNDLEGAL) : null} />
          <Campo rotulo="Órgão" valor={contrato.orgaoNome} />
          <Campo rotulo="Total empenhado" valor={contrato.valorEmpenhado ? formatarMoeda(contrato.valorEmpenhado) : null} />
          <Campo rotulo="Total liquidado" valor={contrato.valorLiquidado ? formatarMoeda(contrato.valorLiquidado) : null} />
          <Campo rotulo="Pago" valor={contrato.valorPago ? formatarMoeda(contrato.valorPago) : null} />
          <Campo rotulo="Saldo a empenhar" valor={saldoEmpenhar !== null ? formatarMoeda(saldoEmpenhar) : null} />
          <Campo rotulo="Saldo a liquidar" valor={saldoLiquidar !== null ? formatarMoeda(saldoLiquidar) : null} />
          <Campo rotulo="Gestor" valor={[contrato.gestorNome, contrato.gestorCargo].filter(Boolean).join(' - ')} />
          <Campo rotulo="Fiscal" valor={[contrato.fiscalNome, contrato.fiscalCargo].filter(Boolean).join(' - ')} />
          <Campo
            rotulo="PNCP"
            valor={contrato.linkPncp
              ? <a href={contrato.linkPncp} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Ver no Portal Nacional de Contratações Públicas</a>
              : null}
          />
        </Campos>
      </Secao>

      {(contrato.licitacao || contrato.licitacaoNumero) && (
        <Secao titulo="Licitação de origem" icone={<Scale className="h-5 w-5 text-purple-700" aria-hidden />}>
          {contrato.licitacao ? (
            <div>
              <Link href={`/licitacoes/${contrato.licitacao.id}`} className="font-medium text-purple-700 hover:underline">
                {contrato.licitacao.modalidade} · processo {contrato.licitacao.numeroProcesso || `${contrato.licitacao.numero}/${contrato.licitacao.ano}`}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm text-slate-600">{contrato.licitacao.objeto}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Processo {contrato.licitacaoNumero} (não encontrado entre as licitações publicadas).</p>
          )}
        </Secao>
      )}

      {contrato.empenhos.length > 0 && (
        <Secao titulo="Empenhos do processo licitatório" icone={<Receipt className="h-5 w-5 text-emerald-700" aria-hidden />}>
          <TabelaEmpenhos empenhos={contrato.empenhos} />
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            O sistema contábil liga o empenho ao processo, não ao contrato: se o processo gerou mais de um contrato,
            esta lista inclui os empenhos de todos eles.
          </p>
        </Secao>
      )}

      <ListaAnexos anexos={contrato.anexos} />
    </div>
  )
}
