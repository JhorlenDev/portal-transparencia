/**
 * Teste rapido de disponibilidade das listagens da Fiorilli usadas (ou desejadas) pelo portal,
 * com uma consulta pequena (mes corrente) e sem retry. Mostra no painel o que esta fora do ar,
 * como Servidores, que em Tefe responde HTTP 500 em qualquer combinacao de parametros.
 */

import { buscarListagem, FiorilliApiError, periodoDoMes, type FiorilliModulo, type FiorilliParams } from './client'
import { agoraEmManaus } from './parse'

export interface SaudeListagem {
  modulo: FiorilliModulo
  listagem: string
  /** Ja sincronizada pelo portal (false = so monitorada). */
  sincronizada: boolean
  ok: boolean
  status: number | null
  registros: number | null
  duracaoMs: number
  erro: string | null
}

const TIMEOUT_MS = 20_000

export async function verificarSaude(agora = new Date()): Promise<SaudeListagem[]> {
  const local = agoraEmManaus(agora)
  const ano = local.getUTCFullYear()
  const mes = local.getUTCMonth() + 1
  const periodo = { ...periodoDoMes(ano, mes), MostraDadosConsolidado: false }

  const alvos: Array<[FiorilliModulo, string, FiorilliParams, boolean]> = [
    ['Despesas', 'DespesasPorOrgao', periodo, true],
    ['Despesas', 'Diarias', periodo, true],
    ['Receitas', 'ReceitaOrcamentaria', periodo, true],
    ['LicitacoesEContratos', 'Licitacoes', { Ano: ano, MostraDadosConsolidado: false }, true],
    ['LicitacoesEContratos', 'Contratos', { Ano: ano, MostraDadosConsolidado: false, ContratosApenasPublicados: false }, true],
    ['Transferencias', 'Transf', { MostraDadosConsolidado: false }, true],
    ['Pessoal', 'Servidores', { Ano: ano, MesFinalPeriodo: String(mes).padStart(2, '0') }, false],
  ]

  return Promise.all(alvos.map(async ([modulo, listagem, params, sincronizada]) => {
    const inicio = Date.now()
    try {
      const dados = await buscarListagem(modulo, listagem, { ConectarExercicio: ano, ...params }, {
        config: { timeoutMs: TIMEOUT_MS, maxRetries: 0 },
      })
      return { modulo, listagem, sincronizada, ok: true, status: 200, registros: dados.length, duracaoMs: Date.now() - inicio, erro: null }
    } catch (erro) {
      return {
        modulo,
        listagem,
        sincronizada,
        ok: false,
        status: erro instanceof FiorilliApiError ? erro.status : null,
        registros: null,
        duracaoMs: Date.now() - inicio,
        erro: erro instanceof Error ? erro.message : String(erro),
      }
    }
  }))
}
