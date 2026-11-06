/**
 * Liquidacoes e pagamentos de um empenho, consultados na Fiorilli quando alguem abre o detalhe da
 * despesa (nao fazem parte da sincronizacao: seriam milhares de chamadas por exercicio).
 *
 * Comportamento da API, verificado contra o servidor de Tefe:
 * - intNumeroEmpenho e o numero do empenho (CODIGO), nao a chave interna PKEMP (que da HTTP 500).
 * - O periodo e IDButton=lnkDespesasPor_NotaEmpenho sao obrigatorios; sem eles, HTTP 500.
 * - Empenhos_Pago_ComOrdemPagto traz cada pagamento com ordem, parcela, desconto e valor pago.
 * - ItensEmpenhoPorNumeroEmpenho veio vazio em todos os testes, por isso nao e consultado.
 */

import { buscarListagem, periodoDoExercicio, type OpcoesChamada } from './client'
import { limparTexto, parseData, parseInteiro, parseMoney } from './parse'

export interface Liquidacao {
  numero: number | null
  data: Date | null
  valor: number
}

export interface Pagamento {
  ordem: string | null
  liquidacao: number | null
  parcela: number | null
  data: Date | null
  valor: number
  desconto: number
  valorPago: number
}

export interface MovimentosEmpenho {
  liquidacoes: Liquidacao[]
  pagamentos: Pagamento[]
  consultadoEm: Date
}

export interface EmpenhoConsulta {
  exercicio: number
  numeroEmpenho: string
  tipoEmpenho: string
  empresa: string
}

const VALIDADE_MS = 10 * 60 * 1000
const MAX_ENTRADAS = 500

const cacheKey = Symbol.for('portal-transparencia.fiorilli-movimentos')

function cache(): Map<string, MovimentosEmpenho> {
  const global = globalThis as typeof globalThis & { [cacheKey]?: Map<string, MovimentosEmpenho> }
  global[cacheKey] ??= new Map()
  return global[cacheKey]
}

function ordenarPorData<T extends { data: Date | null }>(lista: T[]): T[] {
  return lista.sort((a, b) => (a.data?.getTime() ?? 0) - (b.data?.getTime() ?? 0))
}

export async function buscarMovimentosEmpenho(
  empenho: EmpenhoConsulta,
  opcoes: OpcoesChamada = {}
): Promise<MovimentosEmpenho> {
  const chave = [empenho.empresa, empenho.exercicio, empenho.numeroEmpenho, empenho.tipoEmpenho].join('-')
  const guardado = cache().get(chave)
  if (guardado && Date.now() - guardado.consultadoEm.getTime() < VALIDADE_MS) return guardado

  const params = {
    ConectarExercicio: empenho.exercicio,
    Empresa: empenho.empresa,
    intNumeroEmpenho: empenho.numeroEmpenho,
    strTipoEmpenho: empenho.tipoEmpenho,
    ...periodoDoExercicio(empenho.exercicio),
    MostraDadosConsolidado: false,
    IDButton: 'lnkDespesasPor_NotaEmpenho',
  }
  // Quem espera e uma pessoa com a pagina aberta: pouco tempo e uma unica nova tentativa.
  const chamada: OpcoesChamada = { ...opcoes, config: { timeoutMs: 15_000, maxRetries: 1, ...opcoes.config } }

  const [liquidados, ordens] = await Promise.all([
    buscarListagem('Despesas', 'EmpenhosDespesas_Liquidado_PorNumeroEmpenho', params, chamada),
    buscarListagem('Despesas', 'Empenhos_Pago_ComOrdemPagto_PorNumeroEmpenho', params, chamada),
  ])

  const movimentos: MovimentosEmpenho = {
    liquidacoes: ordenarPorData(liquidados.map((r) => ({
      numero: parseInteiro(r.LIQ),
      data: parseData(r.DATAE),
      valor: parseMoney(r.VALOR) ?? 0,
    }))),
    pagamentos: ordenarPorData(ordens.map((r) => ({
      ordem: limparTexto(r.ORDPG),
      liquidacao: parseInteiro(r.NUMLIQ),
      parcela: parseInteiro(r.PARCELA),
      data: parseData(r.DATA),
      valor: parseMoney(r.VALOR) ?? 0,
      desconto: parseMoney(r.DESCONTO) ?? 0,
      valorPago: parseMoney(r.VALPAGO) ?? 0,
    }))),
    consultadoEm: new Date(),
  }

  const mapa = cache()
  if (mapa.size >= MAX_ENTRADAS) mapa.delete(mapa.keys().next().value!)
  mapa.set(chave, movimentos)
  return movimentos
}
