/**
 * Agendador interno dos backups. Roda no processo do Next (mesmo padrao do
 * acordar-cron) e tambem pode ser acionado por cron externo em
 * POST /api/admin/backup/cron.
 */

import type { BackupConfig } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { FUSO, getBackupConfig, type ModoAgenda } from './config'
import { BackupEmAndamentoError } from './lock'
import { executarBackup } from './runner'

export type Alvo = 'LOCAL' | 'NUVEM'

interface PartesData {
  ano: number
  mes: number
  dia: number
  hora: number
  minuto: number
  segundo: number
}

function partesNoFuso(data: Date, fuso = FUSO): PartesData {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: fuso,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const partes: Record<string, string> = {}
  for (const parte of fmt.formatToParts(data)) {
    if (parte.type !== 'literal') partes[parte.type] = parte.value
  }

  return {
    ano: Number(partes.year),
    mes: Number(partes.month),
    dia: Number(partes.day),
    hora: Number(partes.hour === '24' ? '0' : partes.hour),
    minuto: Number(partes.minute),
    segundo: Number(partes.second),
  }
}

/** Converte uma data/hora local do fuso configurado em um instante absoluto. */
export function instanteNoFuso(
  ano: number,
  mes: number,
  dia: number,
  hora: number,
  minuto: number,
  fuso = FUSO
): Date {
  const palpite = Date.UTC(ano, mes - 1, dia, hora, minuto, 0)
  const partes = partesNoFuso(new Date(palpite), fuso)
  const comoUtc = Date.UTC(partes.ano, partes.mes - 1, partes.dia, partes.hora, partes.minuto, partes.segundo)
  return new Date(palpite - (comoUtc - palpite))
}

function diaSemanaNoFuso(data: Date, fuso = FUSO): number {
  const p = partesNoFuso(data, fuso)
  return new Date(Date.UTC(p.ano, p.mes - 1, p.dia)).getUTCDay()
}

function parsearHorarios(valor: string): Array<{ hora: number; minuto: number }> {
  return valor
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => {
      const [hora, minuto] = h.split(':').map(Number)
      return { hora, minuto }
    })
    .filter((h) => Number.isInteger(h.hora) && Number.isInteger(h.minuto))
}

/**
 * Ultimo instante agendado que ja passou, ou null se nenhum candidato nos ultimos 8 dias.
 */
export function ultimoDisparoPrevisto(
  modo: ModoAgenda,
  opcoes: { intervaloHoras: number; horarios: string; diasSemana: string },
  agora: Date,
  ultima: Date | null
): Date | null {
  if (modo === 'INTERVALO') {
    const intervaloMs = Math.max(1, opcoes.intervaloHoras) * 3600_000
    if (!ultima) return agora
    const proxima = new Date(ultima.getTime() + intervaloMs)
    return proxima <= agora ? proxima : null
  }

  const horarios = parsearHorarios(opcoes.horarios)
  if (horarios.length === 0) return null

  const dias = modo === 'SEMANAL'
    ? new Set(
        opcoes.diasSemana
          .split(',')
          .map((d) => Number(d.trim()))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      )
    : null

  if (dias && dias.size === 0) return null

  let melhor: Date | null = null

  for (let recuo = 0; recuo <= 8; recuo++) {
    const referencia = new Date(agora.getTime() - recuo * 24 * 3600_000)
    const p = partesNoFuso(referencia)

    for (const horario of horarios) {
      const candidato = instanteNoFuso(p.ano, p.mes, p.dia, horario.hora, horario.minuto)
      if (candidato > agora) continue
      if (dias && !dias.has(diaSemanaNoFuso(candidato))) continue
      if (!melhor || candidato > melhor) melhor = candidato
    }

    if (melhor) break
  }

  return melhor
}

/** Proximo instante agendado no futuro (para exibir na interface). */
export function proximoDisparoPrevisto(
  modo: ModoAgenda,
  opcoes: { intervaloHoras: number; horarios: string; diasSemana: string },
  agora: Date,
  ultima: Date | null
): Date | null {
  if (modo === 'INTERVALO') {
    const intervaloMs = Math.max(1, opcoes.intervaloHoras) * 3600_000
    const base = ultima ?? agora
    let proxima = new Date(base.getTime() + intervaloMs)
    if (!ultima) proxima = agora
    return proxima > agora ? proxima : agora
  }

  const horarios = parsearHorarios(opcoes.horarios)
  if (horarios.length === 0) return null

  const dias = modo === 'SEMANAL'
    ? new Set(
        opcoes.diasSemana
          .split(',')
          .map((d) => Number(d.trim()))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
      )
    : null

  if (dias && dias.size === 0) return null

  for (let avanco = 0; avanco <= 8; avanco++) {
    const referencia = new Date(agora.getTime() + avanco * 24 * 3600_000)
    const p = partesNoFuso(referencia)

    const candidatos = horarios
      .map((h) => instanteNoFuso(p.ano, p.mes, p.dia, h.hora, h.minuto))
      .filter((c) => c > agora)
      .filter((c) => !dias || dias.has(diaSemanaNoFuso(c)))
      .sort((a, b) => a.getTime() - b.getTime())

    if (candidatos.length > 0) return candidatos[0]
  }

  return null
}

export function deveExecutar(
  config: BackupConfig,
  alvo: Alvo,
  ultima: Date | null,
  agora = new Date()
): { executar: boolean; previsto: Date | null } {
  const ativo = alvo === 'LOCAL' ? config.localAtivo : config.nuvemAtivo
  if (!ativo) return { executar: false, previsto: null }

  const modo = (alvo === 'LOCAL' ? config.localModo : config.nuvemModo) as ModoAgenda
  const previsto = ultimoDisparoPrevisto(
    modo,
    {
      intervaloHoras: alvo === 'LOCAL' ? config.localIntervaloHoras : config.nuvemIntervaloHoras,
      horarios: alvo === 'LOCAL' ? config.localHorarios : config.nuvemHorarios,
      diasSemana: alvo === 'LOCAL' ? config.localDiasSemana : config.nuvemDiasSemana,
    },
    agora,
    ultima
  )

  if (!previsto) return { executar: false, previsto: null }
  if (ultima && previsto <= ultima) return { executar: false, previsto }

  return { executar: true, previsto }
}

async function ultimaExecucao(alvo: Alvo): Promise<Date | null> {
  const job = await prisma.backupJob.findFirst({
    where: { tipo: alvo, status: { in: ['SUCESSO', 'DUPLICADO'] } },
    orderBy: { iniciadoEm: 'desc' },
    select: { iniciadoEm: true },
  })
  return job?.iniciadoEm ?? null
}

export interface ResultadoTick {
  executados: Array<{ alvo: Alvo; jobIds: string[] }>
  pulados: Array<{ alvo: Alvo; motivo: string }>
}

/** Uma rodada do agendador: decide e executa o que estiver vencido. */
export async function rodarTick(agora = new Date()): Promise<ResultadoTick> {
  const resultado: ResultadoTick = { executados: [], pulados: [] }
  const config = await getBackupConfig()

  for (const alvo of ['LOCAL', 'NUVEM'] as Alvo[]) {
    const ultima = await ultimaExecucao(alvo)
    const decisao = deveExecutar(config, alvo, ultima, agora)

    if (!decisao.executar) {
      resultado.pulados.push({ alvo, motivo: decisao.previsto ? 'ainda nao venceu' : 'desativado' })
      continue
    }

    try {
      const execucao = await executarBackup({ escopo: 'COMPLETO', destino: alvo, origem: 'AGENDADO' })
      resultado.executados.push({ alvo, jobIds: execucao.jobs.map((j) => j.id) })
    } catch (erro) {
      if (erro instanceof BackupEmAndamentoError) {
        resultado.pulados.push({ alvo, motivo: 'outro backup em andamento' })
        continue
      }
      console.error(`[backup] falha no agendamento ${alvo}:`, erro)
      resultado.pulados.push({ alvo, motivo: (erro as Error).message })
    }
  }

  return resultado
}

// ---------------------------------------------------------------- loop interno

const chaveEstado = Symbol.for('portal-transparencia.backup-scheduler')
const globalEstado = globalThis as typeof globalThis & { [chaveEstado]?: { iniciado: boolean } }
if (!globalEstado[chaveEstado]) globalEstado[chaveEstado] = { iniciado: false }

const INTERVALO_TICK_MS = 60_000

export function agendadorHabilitado(): boolean {
  const flag = process.env.BACKUP_SCHEDULER_ENABLED?.trim().toLowerCase()
  if (flag === 'true' || flag === '1') return true
  if (flag === 'false' || flag === '0') return false
  return process.env.NODE_ENV === 'production'
}

export function iniciarAgendador(): void {
  const estado = globalEstado[chaveEstado]!
  if (estado.iniciado || !agendadorHabilitado()) return
  estado.iniciado = true

  const timer = setInterval(() => {
    rodarTick().catch((erro) => console.error('[backup] erro no tick do agendador:', erro))
  }, INTERVALO_TICK_MS)

  timer.unref?.()
  console.log(`[backup] agendador interno ativo (tick de ${INTERVALO_TICK_MS / 1000}s, fuso ${FUSO}).`)
}
