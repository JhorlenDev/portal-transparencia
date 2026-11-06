/** Configuracao da integracao com a API de Dados Abertos Fiorilli SCPI (variaveis FIORILLI_*). */

export interface FiorilliConfig {
  baseUrl: string
  empresa: number
  exercicio: number
  timeoutMs: number
  maxRetries: number
}

const BASE_URL_PADRAO = 'https://tefe.dcsistemasweb.app.br:851/transparencia/VersaoJson'

function inteiroPositivo(valor: string | undefined, padrao: number): number {
  const numero = Number(valor)
  return Number.isInteger(numero) && numero >= 0 ? numero : padrao
}

/** Lido a cada chamada para que testes e scripts possam trocar o ambiente em tempo de execucao. */
export function getFiorilliConfig(): FiorilliConfig {
  return {
    baseUrl: (process.env.FIORILLI_BASE_URL || BASE_URL_PADRAO).replace(/\/+$/, ''),
    empresa: inteiroPositivo(process.env.FIORILLI_DEFAULT_EMPRESA, 1),
    exercicio: inteiroPositivo(process.env.FIORILLI_CONECTAR_EXERCICIO, new Date().getFullYear()),
    timeoutMs: inteiroPositivo(process.env.FIORILLI_TIMEOUT_MS, 30_000),
    maxRetries: inteiroPositivo(process.env.FIORILLI_MAX_RETRIES, 3),
  }
}
