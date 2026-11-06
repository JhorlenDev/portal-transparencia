/**
 * Agendador interno da sincronizacao com a Fiorilli. Roda no processo do Next (mesmo padrao do
 * acordar-cron e do backup) e so liga com FIORILLI_SYNC_ENABLED=true.
 *
 * Todo dia, em cada horario de FIORILLI_SYNC_HORARIO (Manaus, lista separada por virgula, padrao
 * 02:00,10:00,18:00), sincroniza o exercicio corrente. Aos domingos, so no primeiro horario do dia,
 * tambem recarrega os exercicios de FIORILLI_SYNC_ANOS_HISTORICOS, que ainda mudam com
 * anulacoes e pagamentos tardios.
 */

import { agoraEmManaus } from './parse'
import { SincronizacaoEmAndamentoError, sincronizarFiorilli } from './sync'

const DOMINGO = 0
const OFFSET_MANAUS_MS = 4 * 60 * 60 * 1000

interface EstadoAgendador {
  iniciado: boolean
  timer: ReturnType<typeof setTimeout> | null
}

const estadoKey = Symbol.for('portal-transparencia.fiorilli-agendador')

function estado(): EstadoAgendador {
  const global = globalThis as typeof globalThis & { [estadoKey]?: EstadoAgendador }
  global[estadoKey] ??= { iniciado: false, timer: null }
  return global[estadoKey]
}

export interface Horario {
  hora: number
  minuto: number
}

export const HORARIOS_PADRAO = '02:00,10:00,18:00'

function horarioValido(texto: string): Horario | null {
  const [hora, minuto] = texto.trim().split(':').map(Number)
  const valido = Number.isInteger(hora) && Number.isInteger(minuto) && hora >= 0 && hora <= 23 && minuto >= 0 && minuto <= 59
  return valido ? { hora, minuto } : null
}

/** Horarios em ordem, sem repeticao; entradas invalidas sao descartadas e, sem nenhuma valida, vale o padrao. */
export function parsearHorarios(valor: string | undefined): Horario[] {
  const lerLista = (texto: string) => texto.split(',').map(horarioValido).filter((h): h is Horario => h !== null)
  const lidos = lerLista(valor || '')
  const horarios = lidos.length > 0 ? lidos : lerLista(HORARIOS_PADRAO)
  const unicos = new Map(horarios.map((h) => [h.hora * 60 + h.minuto, h]))
  return [...unicos.entries()].sort(([a], [b]) => a - b).map(([, h]) => h)
}

export function formatarHorario({ hora, minuto }: Horario): string {
  return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
}

export function parsearAnos(valor: string | undefined): number[] {
  return (valor || '')
    .split(',')
    .map((ano) => Number(ano.trim()))
    .filter((ano) => Number.isInteger(ano) && ano >= 2000 && ano <= 2999)
}

export interface ProximaExecucao {
  quando: Date
  /** Primeiro horario do dia: e nessa execucao que entram os anos historicos aos domingos. */
  primeiraDoDia: boolean
}

/** Proximo instante (absoluto) em que o relogio de Manaus marca um dos horarios (ja ordenados). */
export function proximaExecucao(agora: Date, horarios: Horario[]): ProximaExecucao {
  const local = agoraEmManaus(agora)
  const inicioDoDia = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + OFFSET_MANAUS_MS
  for (const dias of [0, 1]) {
    for (const [indice, { hora, minuto }] of horarios.entries()) {
      const alvo = inicioDoDia + dias * 24 * 60 * 60 * 1000 + (hora * 60 + minuto) * 60 * 1000
      if (alvo > agora.getTime()) return { quando: new Date(alvo), primeiraDoDia: indice === 0 }
    }
  }
  throw new Error('Nenhum horario de sincronizacao configurado')
}

/** Exercicios da execucao agendada que comeca em `agora`. */
export function exerciciosDaExecucao(agora: Date, anosHistoricos: number[], primeiraDoDia = true): number[] {
  const local = agoraEmManaus(agora)
  const anoCorrente = local.getUTCFullYear()
  const historicos = primeiraDoDia && local.getUTCDay() === DOMINGO ? anosHistoricos.filter((ano) => ano < anoCorrente) : []
  return [...new Set([...historicos, anoCorrente])]
}

async function executar(agendada: ProximaExecucao): Promise<void> {
  // Usa o instante agendado, nao o atual: o timer pode disparar alguns milissegundos depois.
  const exercicios = exerciciosDaExecucao(agendada.quando, parsearAnos(process.env.FIORILLI_SYNC_ANOS_HISTORICOS), agendada.primeiraDoDia)
  try {
    const resultados = await sincronizarFiorilli({ exercicios, origem: 'AGENDADO' })
    const falhas = resultados.filter((r) => r.status === 'ERRO' || r.status === 'DIVERGENTE')
    console.log(`[fiorilli] sincronizacao agendada concluida: ${resultados.length} carga(s), ${falhas.length} com problema`)
  } catch (erro) {
    if (erro instanceof SincronizacaoEmAndamentoError) {
      console.warn('[fiorilli] sincronizacao agendada pulada: ja havia uma em andamento')
    } else {
      console.error('[fiorilli] sincronizacao agendada falhou:', erro)
    }
  }
}

function agendar(): void {
  const proxima = proximaExecucao(new Date(), parsearHorarios(process.env.FIORILLI_SYNC_HORARIO))
  estado().timer = setTimeout(() => {
    void executar(proxima).finally(agendar)
  }, proxima.quando.getTime() - Date.now())
}

/** Configuracao efetiva do agendador, para o painel de monitoramento. */
export function configuracaoAgendador(agora = new Date()) {
  const ativo = process.env.FIORILLI_SYNC_ENABLED === 'true'
  const horarios = parsearHorarios(process.env.FIORILLI_SYNC_HORARIO)
  const anosHistoricos = parsearAnos(process.env.FIORILLI_SYNC_ANOS_HISTORICOS)
  const proxima = proximaExecucao(agora, horarios)
  return {
    ativo,
    horarios: horarios.map(formatarHorario),
    anosHistoricos,
    proximaExecucao: ativo ? proxima.quando.toISOString() : null,
    exerciciosDaProxima: ativo ? exerciciosDaExecucao(proxima.quando, anosHistoricos, proxima.primeiraDoDia) : [],
  }
}

export function iniciarAgendadorFiorilli(): void {
  const atual = estado()
  if (atual.iniciado || process.env.FIORILLI_SYNC_ENABLED !== 'true') return

  atual.iniciado = true
  agendar()
  const horarios = parsearHorarios(process.env.FIORILLI_SYNC_HORARIO).map(formatarHorario)
  console.log(`[fiorilli] sincronizacao agendada diariamente as ${horarios.join(', ')} (Manaus)`)
}
