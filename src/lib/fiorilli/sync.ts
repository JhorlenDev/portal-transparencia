/**
 * Orquestra a sincronizacao com a Fiorilli: uma carga por (modulo, exercicio), cada uma
 * registrada em sincronizacao_logs. Uma falha num modulo nao interrompe os demais.
 * Uma unica sincronizacao por processo (lock em memoria, no mesmo padrao do backup).
 */

import { prisma } from '@/lib/prisma'
import type { OpcoesChamada } from './client'
import { sincronizarContratos } from './contratos'
import { sincronizarDespesas } from './despesas'
import { sincronizarDiarias } from './diarias'
import { sincronizarLicitacoes } from './licitacoes'
import { FONTE_FIORILLI } from './persistencia'
import { anoAtualManaus } from './parse'
import { LISTAGENS_RECEITA, sincronizarReceitas } from './receitas'
import { sincronizarTransferencias } from './transferencias'
import type { ResultadoModulo } from './tipos'

export type ModuloFiorilli = 'despesas' | 'receitas' | 'licitacoes' | 'contratos' | 'diarias' | 'transferencias'
/** Ordem de execucao: contratos depois de licitacoes, para ligar o contrato ao processo. */
export const MODULOS_FIORILLI: ModuloFiorilli[] = ['despesas', 'receitas', 'licitacoes', 'contratos', 'diarias', 'transferencias']

export type OrigemSincronizacao = 'MANUAL' | 'AGENDADO' | 'CLI'
export type StatusSincronizacao = 'SUCESSO' | 'DIVERGENTE' | 'IGNORADO' | 'ERRO'

/** Logs EXECUTANDO mais velhos que isso sao de um processo que morreu no meio da carga. */
const LOG_ABANDONADO_MS = 2 * 60 * 60 * 1000

const LISTAGENS: Record<ModuloFiorilli, string> = {
  despesas: 'DespesasPorOrgao,DespesasGerais',
  receitas: LISTAGENS_RECEITA.map(([, listagem]) => listagem).join(','),
  licitacoes: 'Licitacoes',
  contratos: 'Contratos',
  diarias: 'Diarias',
  transferencias: 'Transf',
}

const EXECUTORES: Record<ModuloFiorilli, (exercicio: number, opcoes: OpcoesChamada) => Promise<ResultadoModulo>> = {
  despesas: sincronizarDespesas,
  receitas: (exercicio, opcoes) => sincronizarReceitas(exercicio, opcoes),
  licitacoes: sincronizarLicitacoes,
  contratos: sincronizarContratos,
  diarias: sincronizarDiarias,
  transferencias: sincronizarTransferencias,
}

export class SincronizacaoEmAndamentoError extends Error {
  constructor() {
    super('Ja existe uma sincronizacao com a Fiorilli em andamento.')
    this.name = 'SincronizacaoEmAndamentoError'
  }
}

export interface OpcoesSincronizacao {
  modulos?: ModuloFiorilli[]
  /** Padrao: exercicio corrente. */
  exercicios?: number[]
  origem?: OrigemSincronizacao
  chamada?: OpcoesChamada
}

export interface ResultadoSincronizacao extends Partial<ResultadoModulo> {
  modulo: ModuloFiorilli
  exercicio: number
  status: StatusSincronizacao
  logId: string
  duracaoMs: number
  erro?: string
}

interface EstadoSincronizacao {
  executando: boolean
  iniciadoEm: string | null
}

const estadoKey = Symbol.for('portal-transparencia.fiorilli-sync')

function estado(): EstadoSincronizacao {
  const global = globalThis as typeof globalThis & { [estadoKey]?: EstadoSincronizacao }
  global[estadoKey] ??= { executando: false, iniciadoEm: null }
  return global[estadoKey]
}

export function estadoSincronizacao(): Readonly<EstadoSincronizacao> {
  return { ...estado() }
}

function statusDe(resultado: ResultadoModulo): StatusSincronizacao {
  if (resultado.ignorado) return 'IGNORADO'
  return resultado.divergencias.length > 0 ? 'DIVERGENTE' : 'SUCESSO'
}

function mensagemDe(resultado: ResultadoModulo): string | null {
  const partes = [resultado.ignorado, resultado.aviso, ...resultado.divergencias].filter(Boolean)
  return partes.length > 0 ? partes.join('\n') : null
}

async function executarCarga(
  modulo: ModuloFiorilli,
  exercicio: number,
  origem: OrigemSincronizacao,
  chamada: OpcoesChamada
): Promise<ResultadoSincronizacao> {
  const inicio = Date.now()
  const log = await prisma.sincronizacaoLog.create({
    data: { fonte: FONTE_FIORILLI, modulo, listagem: LISTAGENS[modulo], exercicio, periodo: `${exercicio}-01-01/${exercicio}-12-31`, origem },
  })

  try {
    const resultado = await EXECUTORES[modulo](exercicio, chamada)
    const status = statusDe(resultado)
    const duracaoMs = Date.now() - inicio

    await prisma.sincronizacaoLog.update({
      where: { id: log.id },
      data: {
        status,
        recebidos: resultado.recebidos,
        inseridos: resultado.inseridos,
        atualizados: resultado.atualizados,
        removidos: resultado.removidos,
        erros: resultado.erros,
        mensagemErro: mensagemDe(resultado),
        finalizadoEm: new Date(),
        duracaoMs,
      },
    })

    return { modulo, exercicio, status, logId: log.id, duracaoMs, ...resultado }
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    const duracaoMs = Date.now() - inicio
    console.error(`[fiorilli] carga de ${modulo}/${exercicio} falhou:`, erro)

    await prisma.sincronizacaoLog.update({
      where: { id: log.id },
      data: { status: 'ERRO', mensagemErro: mensagem, finalizadoEm: new Date(), duracaoMs },
    })

    return { modulo, exercicio, status: 'ERRO', logId: log.id, duracaoMs, erro: mensagem }
  }
}

export async function sincronizarFiorilli(opcoes: OpcoesSincronizacao = {}): Promise<ResultadoSincronizacao[]> {
  const atual = estado()
  if (atual.executando) throw new SincronizacaoEmAndamentoError()

  atual.executando = true
  atual.iniciadoEm = new Date().toISOString()

  try {
    await prisma.sincronizacaoLog.updateMany({
      where: {
        fonte: FONTE_FIORILLI,
        status: 'EXECUTANDO',
        iniciadoEm: { lt: new Date(Date.now() - LOG_ABANDONADO_MS) },
      },
      data: { status: 'INTERROMPIDO', finalizadoEm: new Date() },
    })

    const pedidos = opcoes.modulos?.length ? opcoes.modulos : MODULOS_FIORILLI
    const modulos = MODULOS_FIORILLI.filter((m) => pedidos.includes(m))
    const exercicios = opcoes.exercicios?.length ? opcoes.exercicios : [anoAtualManaus()]
    const resultados: ResultadoSincronizacao[] = []

    for (const exercicio of exercicios) {
      for (const modulo of modulos) {
        resultados.push(await executarCarga(modulo, exercicio, opcoes.origem ?? 'MANUAL', opcoes.chamada ?? {}))
      }
    }

    return resultados
  } finally {
    atual.executando = false
    atual.iniciadoEm = null
  }
}
