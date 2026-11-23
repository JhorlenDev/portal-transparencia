import Link from "next/link"
import { notFound } from "next/navigation"
import { CalendarClock, FileSignature, Info, Receipt } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { StructuredData } from "@/components/portal/structured-data"
import { Campo, Campos, CartaoValor, ListaAnexos, Secao, TabelaEmpenhos, TextoLongo, Voltar, formatarData, formatarMoeda } from "@/components/portal/detalhe"
import { getLicitacaoDetalhe } from "@/lib/site-data"
import { parseMoney } from "@/lib/fiorilli/parse"
import { statusLicitacao } from "../status"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

type Licitacao = NonNullable<Awaited<ReturnType<typeof getLicitacaoDetalhe>>>

/** A Fiorilli corta o objeto da licitacao (DISCR) em 150 caracteres; o do contrato vem inteiro. */
const LIMITE_OBJETO_FIORILLI = 150

function objetoCompleto(licitacao: Licitacao): { texto: string; origem: 'contrato' | 'cortado' | null } {
  const cortado = licitacao.fonte === 'fiorilli' && licitacao.objeto.length >= LIMITE_OBJETO_FIORILLI
  if (!cortado) return { texto: licitacao.objeto, origem: null }
  const inicio = licitacao.objeto.slice(0, 140).toLowerCase()
  const doContrato = licitacao.contratos.find((c) => c.objeto.length > licitacao.objeto.length && c.objeto.toLowerCase().startsWith(inicio))
  return doContrato ? { texto: doContrato.objeto, origem: 'contrato' } : { texto: licitacao.objeto, origem: 'cortado' }
}

function titulo(licitacao: Licitacao): string {
  return `Licitação ${licitacao.numero}/${licitacao.ano}`
}

export async function generateMetadata({ params }: PageProps) {
  const licitacao = await getLicitacaoDetalhe((await params).id)
  if (!licitacao) return { title: "Licitação não encontrada | Portal da Transparência" }
  return {
    title: `${titulo(licitacao)} - ${licitacao.modalidade} | Portal da Transparência`,
    description: `${titulo(licitacao)} (${licitacao.modalidade}): ${licitacao.objeto.slice(0, 150)}`,
  }
}

export default async function LicitacaoDetalhe({ params }: PageProps) {
  const licitacao = await getLicitacaoDetalhe((await params).id)
  if (!licitacao) notFound()

  const fiorilli = licitacao.fonte === 'fiorilli'
  const payload = (licitacao.payload ?? {}) as Record<string, string | null>
  const status = statusLicitacao(licitacao.status)
  const objeto = objetoCompleto(licitacao)
  // VALOR1 da Fiorilli e o valor final do processo (ex.: estimado 262.800, homologado 254.400 = valor do contrato).
  const valorHomologado = fiorilli ? parseMoney(payload.VALOR1) : null
  const totalContratado = licitacao.contratos.reduce((t, c) => t + (c.valorAtual ?? c.valorInicial), 0)
  // Datas extras da Fiorilli, so exibidas: chegam como "DD/MM/YYYY 00:00:00".
  const envio = payload.DTENV ? `${payload.DTENV.slice(0, 10)}${payload.HORENV ? ` às ${payload.HORENV}` : ''}` : null
  const propostas = payload.DTPROPOSTAINI
    ? `${payload.DTPROPOSTAINI.slice(0, 10)}${payload.DTPROPOSTAFIM ? ` a ${payload.DTPROPOSTAFIM.slice(0, 10)}` : ''}`
    : null
  const voltar = `/licitacoes?ano=${licitacao.ano}`

  return (
    <div className="portal-detail container mx-auto px-4 py-6">
      <StructuredData
        type="webpage"
        data={{
          title: titulo(licitacao),
          description: `${titulo(licitacao)} - ${licitacao.modalidade}`,
          url: `/licitacoes/${licitacao.id}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Licitações", url: "/licitacoes" },
            { name: titulo(licitacao), url: `/licitacoes/${licitacao.id}` },
          ]
        }}
      />

      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Licitações", href: voltar },
        { label: titulo(licitacao) },
      ]} />

      <Voltar href={voltar}>Voltar para as licitações de {licitacao.ano}</Voltar>

      <Card className="portal-detail-hero relative mb-6 overflow-hidden border-0 bg-institutional text-white shadow-[0_14px_36px_rgba(18,52,91,0.18)]">
        <span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-digital/30" aria-hidden />
        <CardContent className="relative p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{titulo(licitacao)}</h1>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${status.cor}`}>{status.label}</span>
          </div>
          <p className="mt-2 text-lg font-semibold text-amber-800">{licitacao.modalidade}</p>
          {licitacao.numeroProcesso && <p className="text-sm text-white/60">Processo {licitacao.numeroProcesso}</p>}
          <TextoLongo rotulo="Objeto" texto={objeto.origem === 'cortado' ? `${objeto.texto}…` : objeto.texto} />
          {objeto.origem && (
            <p className="mt-2 text-xs text-white/55">
              {objeto.origem === 'contrato'
                ? 'O sistema contábil publica o objeto da licitação cortado em 150 caracteres; o texto completo acima vem do contrato gerado por ela.'
                : 'O sistema contábil publica o objeto da licitação cortado em 150 caracteres.'}
            </p>
          )}
          <TextoLongo rotulo="Justificativa" texto={licitacao.justificativa} />
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {licitacao.valorEstimado !== null && (
          <CartaoValor rotulo="Valor estimado" valor={licitacao.valorEstimado} cor="border-l-purple-500" />
        )}
        {valorHomologado !== null ? (
          <CartaoValor
            rotulo="Valor homologado"
            valor={valorHomologado}
            cor="border-l-emerald-500"
            detalhe={licitacao.valorEstimado && valorHomologado < licitacao.valorEstimado
              ? `${formatarMoeda(licitacao.valorEstimado - valorHomologado)} abaixo do estimado`
              : undefined}
          />
        ) : null}
        {licitacao.contratos.length > 0 && (
          <CartaoValor
            rotulo="Total contratado"
            valor={totalContratado}
            cor="border-l-amber-500"
            detalhe={`${licitacao.contratos.length} contrato${licitacao.contratos.length > 1 ? 's' : ''}`}
          />
        )}
      </div>

      <Secao titulo="Dados do processo" icone={<CalendarClock className="h-5 w-5 text-slate-600" aria-hidden />}>
        <Campos>
          <Campo rotulo="Número do processo" valor={licitacao.numeroProcesso} />
          <Campo rotulo="Nº do edital" valor={licitacao.numeroEdital} />
          <Campo rotulo="Abertura" valor={licitacao.dataAbertura ? formatarData(licitacao.dataAbertura) : null} />
          <Campo rotulo="Encerramento" valor={licitacao.dataEncerramento ? formatarData(licitacao.dataEncerramento) : null} />
          <Campo rotulo="Envio" valor={envio} />
          <Campo rotulo="Recebimento de propostas" valor={propostas} />
          <Campo rotulo="Registro de preço" valor={licitacao.registroPreco === null ? null : licitacao.registroPreco ? 'Sim' : 'Não'} />
          <Campo rotulo="Critério de julgamento" valor={licitacao.criterioJulgamento} />
          <Campo rotulo="Fundamento legal" valor={licitacao.fundamentoLegal} />
          <Campo rotulo="Regulamento" valor={licitacao.regulamento} />
          <Campo rotulo="Tipo de objeto" valor={licitacao.tipoObjeto} />
          <Campo rotulo="Autoridade" valor={licitacao.autoridade} />
          <Campo rotulo="Órgão" valor={licitacao.orgaoNome} />
          <Campo
            rotulo="PNCP"
            valor={licitacao.linkPncp
              ? <a href={licitacao.linkPncp} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">Ver no Portal Nacional de Contratações Públicas</a>
              : null}
          />
        </Campos>
        {fiorilli && (
          <p className="mt-5 flex items-start gap-2 text-xs text-slate-500">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Edital, participantes e vencedor não são publicados pelo sistema contábil (Fiorilli) e por isso não aparecem aqui.
          </p>
        )}
      </Secao>

      {licitacao.contratos.length > 0 && (
        <Secao titulo="Contratos desta licitação" icone={<FileSignature className="h-5 w-5 text-amber-700" aria-hidden />}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Contrato</th>
                  <th className="py-2 pr-3">Contratado</th>
                  <th className="py-2 pr-3">Vigência</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {licitacao.contratos.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <Link href={`/contratos/${c.id}`} className="font-medium text-amber-800 hover:underline">
                        {c.numero.includes('/') ? c.numero : `${c.numero}/${c.ano}`}
                      </Link>
                      <p className="text-xs capitalize text-slate-500">{c.status}</p>
                    </td>
                    <td className="py-2 pr-3 min-w-[12rem]">
                      {c.contratadoNome}
                      {c.contratadoCnpj && <p className="text-xs text-slate-500 whitespace-nowrap">{c.contratadoCnpj}</p>}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatarData(c.dataInicioVigencia)}
                      <p className="text-xs text-slate-500">até {formatarData(c.dataFimVigencia)}</p>
                    </td>
                    <td className="py-2 text-right font-medium text-emerald-800 whitespace-nowrap">{formatarMoeda(c.valorAtual ?? c.valorInicial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      )}

      {licitacao.empenhos.length > 0 && (
        <Secao titulo="Empenhos deste processo" icone={<Receipt className="h-5 w-5 text-emerald-700" aria-hidden />}>
          <TabelaEmpenhos empenhos={licitacao.empenhos} />
        </Secao>
      )}

      <ListaAnexos anexos={licitacao.anexos} />
    </div>
  )
}
