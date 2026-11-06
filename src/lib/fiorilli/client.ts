/**
 * Cliente HTTP da API de Dados Abertos Fiorilli SCPI 9.0 (servidor IIS da DC Sistemas).
 *
 * Peculiaridades tratadas aqui:
 * - Sem paginacao: cada chamada devolve o array inteiro, por isso quem chama fatia por periodo
 *   (ver `periodoDoMes`).
 * - Alguns endpoints dao HTTP 500 se um parametro for omitido, mesmo vazio
 *   (ex.: `UFParaFiltroCOVID=`). Os parametros sao enviados exatamente como recebidos,
 *   incluindo os vazios. Atencao ao contrario tambem: em ReceitaOrcamentaria, `CodigoReceita=`
 *   vazio faz a API devolver []; esse parametro deve ser omitido quando nao houver filtro.
 * - O servidor oscila: timeout por tentativa e retry com backoff exponencial (1s, 3s, 9s + jitter)
 *   para falhas de rede, timeout e 5xx. Erros 4xx nao sao repetidos.
 */

import { getFiorilliConfig, type FiorilliConfig } from './config'

export type FiorilliModulo = 'Despesas' | 'Receitas' | 'LicitacoesEContratos' | 'Transferencias' | 'Pessoal'

export type FiorilliParams = Record<string, string | number | boolean>

/** Registro cru da API: todos os campos chegam como texto (ou null). */
export type FiorilliRegistro = Record<string, string | null>

export class FiorilliApiError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly status: number | null,
    readonly tentativas: number
  ) {
    super(message)
    this.name = 'FiorilliApiError'
  }
}

export interface OpcoesChamada {
  /** Sobrescreve a configuracao lida do ambiente (usado nos testes). */
  config?: Partial<FiorilliConfig>
  /** Base do backoff em ms; o atraso da tentativa n e base * 3^(n-1) + jitter. */
  backoffBaseMs?: number
}

const BACKOFF_BASE_MS = 1000

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function atrasoBackoff(tentativa: number, baseMs: number): number {
  const exponencial = baseMs * 3 ** (tentativa - 1)
  return exponencial + Math.random() * baseMs * 0.5
}

/** Monta a URL mantendo a ordem e os parametros vazios. `Listagem` vai sempre primeiro. */
export function montarUrl(baseUrl: string, modulo: FiorilliModulo, listagem: string, params: FiorilliParams): string {
  const query = new URLSearchParams({ Listagem: listagem })
  for (const [chave, valor] of Object.entries(params)) {
    query.append(chave, typeof valor === 'boolean' ? (valor ? 'True' : 'False') : String(valor))
  }
  return `${baseUrl}/${modulo}/?${query.toString()}`
}

/** Parametros padrao de periodo de um mes inteiro, no formato que a API espera. */
export function periodoDoMes(ano: number, mes: number): FiorilliParams {
  const ultimoDia = new Date(Date.UTC(ano, mes, 0)).getUTCDate()
  const p = (n: number) => String(n).padStart(2, '0')
  return {
    Ano: ano,
    DiaInicioPeriodo: '01',
    MesInicialPeriodo: p(mes),
    DiaFinalPeriodo: p(ultimoDia),
    MesFinalPeriodo: p(mes),
  }
}

/**
 * Exercicio inteiro (01/01 a 31/12). As listagens de despesa sao cumulativas desde 01/01
 * independentemente do dia inicial informado, entao fatiar por mes so repete dados.
 */
export function periodoDoExercicio(ano: number): FiorilliParams {
  return {
    Ano: ano,
    DiaInicioPeriodo: '01',
    MesInicialPeriodo: '01',
    DiaFinalPeriodo: '31',
    MesFinalPeriodo: '12',
  }
}

/** Datas no formato "DD.MM.YYYY", exigido pela listagem DespesasporExigibilidade. */
export function dataComPontos(ano: number, mes: number, dia: number): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(dia)}.${p(mes)}.${ano}`
}

function deveRepetir(status: number | null): boolean {
  return status === null || status >= 500 || status === 408 || status === 429
}

/**
 * Busca uma listagem e devolve o array de registros. `ConectarExercicio` e `Empresa` vem da
 * configuracao quando nao forem passados em `params`.
 */
export async function buscarListagem(
  modulo: FiorilliModulo,
  listagem: string,
  params: FiorilliParams = {},
  opcoes: OpcoesChamada = {}
): Promise<FiorilliRegistro[]> {
  const config = { ...getFiorilliConfig(), ...opcoes.config }
  const backoffBaseMs = opcoes.backoffBaseMs ?? BACKOFF_BASE_MS

  const url = montarUrl(config.baseUrl, modulo, listagem, {
    ConectarExercicio: config.exercicio,
    Empresa: config.empresa,
    ...params,
  })

  const totalTentativas = config.maxRetries + 1
  let ultimoErro: FiorilliApiError | null = null

  for (let tentativa = 1; tentativa <= totalTentativas; tentativa++) {
    let status: number | null = null

    try {
      const resposta = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeoutMs),
      })
      status = resposta.status
      const corpo = await resposta.text()

      if (!resposta.ok) {
        throw new FiorilliApiError(`HTTP ${status} em ${listagem}`, url, status, tentativa)
      }

      let dados: unknown
      try {
        dados = JSON.parse(corpo)
      } catch {
        throw new FiorilliApiError(`Resposta de ${listagem} nao e JSON valido`, url, status, tentativa)
      }

      if (!Array.isArray(dados)) {
        throw new FiorilliApiError(`Resposta de ${listagem} nao e um array`, url, status, tentativa)
      }

      return dados as FiorilliRegistro[]
    } catch (erro) {
      if (erro instanceof FiorilliApiError) {
        ultimoErro = erro
        // JSON invalido com 200 costuma ser pagina de erro do IIS; vale repetir.
        const repetir = deveRepetir(erro.status) || erro.status === 200
        if (!repetir) throw erro
      } else {
        const motivo = erro instanceof Error && erro.name === 'TimeoutError'
          ? `timeout de ${config.timeoutMs}ms`
          : erro instanceof Error ? erro.message : String(erro)
        ultimoErro = new FiorilliApiError(`Falha ao chamar ${listagem}: ${motivo}`, url, status, tentativa)
      }

      if (tentativa < totalTentativas) {
        await esperar(atrasoBackoff(tentativa, backoffBaseMs))
      }
    }
  }

  throw new FiorilliApiError(
    `${ultimoErro?.message ?? 'Falha desconhecida'} (apos ${totalTentativas} tentativa(s))`,
    url,
    ultimoErro?.status ?? null,
    totalTentativas
  )
}
