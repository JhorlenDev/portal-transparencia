import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { AlertTriangle, Banknote, ClipboardCheck, FileText, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Breadcrumbs } from "@/components/portal/breadcrumbs"
import { Campo, Campos, CartaoValor, ListaAnexos, Secao, TextoLongo, Voltar, formatarData, formatarMoeda } from "@/components/portal/detalhe"
import { StructuredData } from "@/components/portal/structured-data"
import { getDespesaDetalhe } from "@/lib/site-data"
import { buscarMovimentosEmpenho } from "@/lib/fiorilli/movimentos-empenho"

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

type Despesa = NonNullable<Awaited<ReturnType<typeof getDespesaDetalhe>>>

const TIPOS_EMPENHO: Record<string, string> = {
  OR: "Ordinário",
  ES: "Estimativo",
  GL: "Global",
  AN: "Anulação",
}

function titulo(despesa: Despesa): string {
  return `Empenho ${despesa.numeroEmpenho}/${despesa.exercicio}`
}

export async function generateMetadata({ params }: PageProps) {
  const despesa = await getDespesaDetalhe((await params).id)
  if (!despesa) return { title: "Despesa não encontrada | Portal da Transparência" }
  return {
    title: `${titulo(despesa)} - ${despesa.credorNome ?? 'Despesa'} | Portal da Transparência`,
    description: `${titulo(despesa)}: ${formatarMoeda(despesa.valorEmpenhado)} empenhados para ${despesa.credorNome ?? 'credor não informado'}. ${despesa.objeto?.slice(0, 120) ?? ''}`,
  }
}

/** Liquidacoes e pagamentos consultados na hora na Fiorilli (com cache de 10 minutos). */
async function Movimentacao({ despesa }: { despesa: Despesa }) {
  const payload = (despesa.payload ?? {}) as Record<string, string | null>
  let movimentos
  try {
    movimentos = await buscarMovimentosEmpenho({
      exercicio: despesa.exercicio,
      numeroEmpenho: despesa.numeroEmpenho,
      tipoEmpenho: despesa.tipoEmpenho!,
      empresa: payload.EMPRESA ?? '1',
    })
  } catch {
    return (
      <p className="flex items-start gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        O sistema contábil não respondeu agora, então o histórico de liquidações e pagamentos não pôde ser carregado.
        Os demais dados desta página continuam válidos. Tente novamente em alguns minutos.
      </p>
    )
  }

  const totalPago = movimentos.pagamentos.reduce((t, p) => t + p.valorPago, 0)
  const totalDescontos = movimentos.pagamentos.reduce((t, p) => t + p.desconto, 0)

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card className="min-w-0 overflow-hidden border-amber-100 shadow-none">
        <CardContent className="p-3.5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-institutional">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50"><ClipboardCheck className="h-4 w-4 text-amber-700" aria-hidden /></span> Liquidações
          </h3>
          {movimentos.liquidacoes.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Nenhuma liquidação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Nº</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 text-left">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimentos.liquidacoes.map((l, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3">{l.numero ?? '-'}</td>
                      <td className="py-2 pr-3">{formatarData(l.data)}</td>
                      <td className="py-2 text-left font-medium text-amber-800 whitespace-nowrap">{formatarMoeda(l.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0 overflow-hidden border-emerald-100 shadow-none">
        <CardContent className="p-3.5">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-institutional">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50"><Banknote className="h-4 w-4 text-emerald-700" aria-hidden /></span> Pagamentos
          </h3>
          {movimentos.pagamentos.length === 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-500">Nenhum pagamento registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Ordem</th>
                    <th className="py-2 pr-3 text-left">Valor</th>
                    <th className="py-2 pr-3 text-left">Desconto</th>
                    <th className="py-2 text-left">Pago</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {movimentos.pagamentos.map((p, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatarData(p.data)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {p.ordem ?? '-'}
                        {p.parcela !== null && <span className="text-xs text-slate-500"> · parcela {p.parcela}</span>}
                      </td>
                      <td className="py-2 pr-3 text-left whitespace-nowrap">{formatarMoeda(p.valor)}</td>
                      <td className="py-2 pr-3 text-left whitespace-nowrap text-slate-600">{p.desconto ? formatarMoeda(p.desconto) : '-'}</td>
                      <td className="py-2 text-left font-medium text-emerald-800 whitespace-nowrap">{formatarMoeda(p.valorPago)}</td>
                    </tr>
                  ))}
                </tbody>
                {movimentos.pagamentos.length > 1 && (
                  <tfoot>
                    <tr className="border-t border-slate-200 font-semibold">
                      <td className="py-2 pr-3" colSpan={3}>Total</td>
                      <td className="py-2 pr-3 text-right whitespace-nowrap text-slate-600">{totalDescontos ? formatarMoeda(totalDescontos) : '-'}</td>
                      <td className="py-2 text-right whitespace-nowrap text-emerald-800">{formatarMoeda(totalPago)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
          {totalDescontos > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              Descontos são retenções feitas no pagamento (impostos, contribuições), repassadas aos respectivos órgãos.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="px-1 text-[10px] text-slate-500 lg:col-span-2">
        Consultado no sistema contábil em {movimentos.consultadoEm.toLocaleString('pt-BR', { timeZone: 'America/Manaus' })}.
        Pagamentos de restos a pagar feitos em exercícios seguintes não aparecem aqui.
      </p>
    </div>
  )
}

export default async function DespesaDetalhe({ params }: PageProps) {
  const despesa = await getDespesaDetalhe((await params).id)
  if (!despesa) notFound()

  const anulacao = despesa.tipoEmpenho === 'AN'
  // EMPENHADO e o valor bruto; as anulacoes vem negativas em valorAnulado (e como lancamentos proprios).
  const anulado = !anulacao && despesa.valorAnulado ? despesa.valorAnulado : 0
  const empenhadoLiquido = (despesa.valorEmpenhado ?? 0) + anulado
  const percentual = (valor: number | null) => {
    if (empenhadoLiquido <= 0 || valor === null) return undefined
    const base = anulado ? 'do empenhado após anulações' : 'do empenhado'
    return `${((valor / empenhadoLiquido) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% ${base}`
  }
  const consultaMovimentos = despesa.fonte === 'fiorilli' && !anulacao && Boolean(despesa.tipoEmpenho)
  const elemento = [despesa.elementoDespesa, despesa.elementoDespesaNome].filter(Boolean).join(' - ')
  const fonteRecurso = [despesa.fonteRecurso, despesa.fonteRecursoNome].filter(Boolean).join(' - ')
  const licitacao = [despesa.modalidadeLicitacao, despesa.numeroLicitacao && `nº ${despesa.numeroLicitacao}`].filter(Boolean).join(' ')
  const voltar = `/despesas?ano=${despesa.exercicio}`

  return (
    <div className="portal-detail container mx-auto px-4 py-6">
      <StructuredData
        type="webpage"
        data={{
          title: titulo(despesa),
          description: `${titulo(despesa)} - ${despesa.credorNome ?? ''}`,
          url: `/despesas/${despesa.id}`,
          breadcrumbs: [
            { name: "Home", url: "/" },
            { name: "Despesas", url: "/despesas" },
            { name: titulo(despesa), url: `/despesas/${despesa.id}` },
          ]
        }}
      />

      <Breadcrumbs items={[
        { label: "Transparência", href: "/" },
        { label: "Despesas", href: voltar },
        { label: titulo(despesa) },
      ]} />

      <Voltar href={voltar}>Voltar para as despesas de {despesa.exercicio}</Voltar>

      <Card className="portal-detail-hero relative mb-6 overflow-hidden border-0 bg-institutional text-white shadow-[0_14px_36px_rgba(18,52,91,0.18)]">
        <span className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#B42318]/25" aria-hidden />
        <CardContent className="relative p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{titulo(despesa)}</h1>
            {despesa.tipoEmpenho && (
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${anulacao ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {TIPOS_EMPENHO[despesa.tipoEmpenho] ?? despesa.tipoEmpenho}
              </span>
            )}
            <span className="text-sm text-white/60">emitido em {formatarData(despesa.dataEmpenho)}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1"><p className="text-base font-bold text-white">{despesa.credorNome ?? 'Credor não informado'}</p>{despesa.credorCpfCnpj && <p className="text-xs text-white/60">CPF/CNPJ {despesa.credorCpfCnpj}</p>}</div>
          <TextoLongo rotulo="Histórico" texto={despesa.historico || despesa.objeto} />
          {anulacao && (
            <p className="mt-4 text-sm text-red-700">
              Este lançamento é uma anulação: cancela total ou parcialmente um empenho e entra com valor negativo nos totais.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <CartaoValor
          rotulo="Empenhado"
          valor={despesa.valorEmpenhado}
          cor="border-l-blue-500"
          detalhe={anulado ? `anulado ${formatarMoeda(-anulado)} · líquido ${formatarMoeda(empenhadoLiquido)}` : undefined}
        />
        <CartaoValor rotulo="Liquidado" valor={despesa.valorLiquidado} cor="border-l-amber-500" detalhe={percentual(despesa.valorLiquidado)} />
        <CartaoValor rotulo="Pago" valor={despesa.valorPago} cor="border-l-emerald-500" detalhe={percentual(despesa.valorPago)} />
      </div>

      <Secao titulo="Classificação da despesa" icone={<FileText className="h-5 w-5 text-slate-600" aria-hidden />}>
        <Campos>
            <Campo rotulo="Órgão" valor={despesa.orgaoNome} />
            <Campo rotulo="Unidade" valor={despesa.unidadeNome} />
            <Campo rotulo="Função" valor={despesa.funcao} />
            <Campo rotulo="Subfunção" valor={despesa.subfuncao} />
            <Campo rotulo="Programa" valor={despesa.programa} />
            <Campo rotulo="Ação" valor={despesa.acao} />
            <Campo rotulo="Elemento de despesa" valor={elemento} />
            <Campo rotulo="Fonte de recurso" valor={fonteRecurso} />
            <Campo
              rotulo="Licitação"
              valor={despesa.licitacaoId
                ? <Link href={`/licitacoes/${despesa.licitacaoId}`} className="text-purple-700 hover:underline">{licitacao}</Link>
                : licitacao}
            />
        </Campos>
      </Secao>

      {consultaMovimentos && (
        <Secao titulo="Movimentação do empenho" icone={<Banknote className="h-4 w-4 text-digital" aria-hidden />}>
          <Suspense
            fallback={
              <p className="flex items-center gap-2 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Consultando liquidações e pagamentos no sistema contábil...
              </p>
            }
          >
            <Movimentacao despesa={despesa} />
          </Suspense>
        </Secao>
      )}

      <ListaAnexos anexos={despesa.anexos} />
    </div>
  )
}
