import type { BackupConfig } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const ID_CONFIG = 'singleton'
export const MODOS = ['INTERVALO', 'DIARIO', 'SEMANAL'] as const
export type ModoAgenda = (typeof MODOS)[number]

export const ESCOPOS = ['COMPLETO', 'BANCO', 'MIDIAS'] as const
export type EscopoBackup = (typeof ESCOPOS)[number]

export const DESTINOS = ['LOCAL', 'NUVEM', 'AMBOS'] as const
export type DestinoBackup = (typeof DESTINOS)[number]

/** Fuso usado no agendamento (Tefe/AM). */
export const FUSO = process.env.BACKUP_TIMEZONE?.trim() || 'America/Manaus'

export async function getBackupConfig(): Promise<BackupConfig> {
  const existente = await prisma.backupConfig.findUnique({ where: { id: ID_CONFIG } })
  if (existente) return existente

  return prisma.backupConfig.create({ data: { id: ID_CONFIG } })
}

function inteiro(valor: unknown, min: number, max: number, padrao: number): number {
  const n = Number(valor)
  if (!Number.isFinite(n)) return padrao
  return Math.min(max, Math.max(min, Math.trunc(n)))
}

function booleano(valor: unknown, padrao: boolean): boolean {
  if (typeof valor === 'boolean') return valor
  if (valor === 'true') return true
  if (valor === 'false') return false
  return padrao
}

/** Normaliza "3:0, 15:30" -> "03:00,15:30". Devolve null se nenhum horario for valido. */
export function normalizarHorarios(valor: unknown): string | null {
  if (typeof valor !== 'string') return null

  const horarios = valor
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => {
      const m = /^(\d{1,2}):(\d{1,2})$/.exec(h)
      if (!m) return null
      const hora = Number(m[1])
      const minuto = Number(m[2])
      if (hora < 0 || hora > 23 || minuto < 0 || minuto > 59) return null
      return `${String(hora).padStart(2, '0')}:${String(minuto).padStart(2, '0')}`
    })
    .filter((h): h is string => h !== null)

  const unicos = [...new Set(horarios)].sort()
  return unicos.length > 0 ? unicos.join(',') : null
}

/** Normaliza "0,1,7" -> "0,1" (0=domingo ... 6=sabado). */
export function normalizarDiasSemana(valor: unknown): string | null {
  if (typeof valor !== 'string') return null

  const dias = valor
    .split(',')
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)

  const unicos = [...new Set(dias)].sort((a, b) => a - b)
  return unicos.length > 0 ? unicos.join(',') : null
}

function modo(valor: unknown, padrao: ModoAgenda): ModoAgenda {
  return MODOS.includes(valor as ModoAgenda) ? (valor as ModoAgenda) : padrao
}

export interface EntradaConfig {
  incluirBanco?: unknown
  incluirMidias?: unknown
  pularDuplicados?: unknown
  localAtivo?: unknown
  localModo?: unknown
  localIntervaloHoras?: unknown
  localHorarios?: unknown
  localDiasSemana?: unknown
  localRetencaoQtd?: unknown
  localRetencaoDias?: unknown
  nuvemAtivo?: unknown
  nuvemModo?: unknown
  nuvemIntervaloHoras?: unknown
  nuvemHorarios?: unknown
  nuvemDiasSemana?: unknown
  nuvemRetencaoQtd?: unknown
  nuvemRetencaoDias?: unknown
  driveFolderId?: unknown
  driveFolderNome?: unknown
}

export async function salvarBackupConfig(entrada: EntradaConfig): Promise<BackupConfig> {
  const atual = await getBackupConfig()

  const dados = {
    incluirBanco: booleano(entrada.incluirBanco, atual.incluirBanco),
    incluirMidias: booleano(entrada.incluirMidias, atual.incluirMidias),
    pularDuplicados: booleano(entrada.pularDuplicados, atual.pularDuplicados),

    localAtivo: booleano(entrada.localAtivo, atual.localAtivo),
    localModo: modo(entrada.localModo, atual.localModo as ModoAgenda),
    localIntervaloHoras: inteiro(entrada.localIntervaloHoras, 1, 24 * 30, atual.localIntervaloHoras),
    localHorarios: normalizarHorarios(entrada.localHorarios) ?? atual.localHorarios,
    localDiasSemana: normalizarDiasSemana(entrada.localDiasSemana) ?? atual.localDiasSemana,
    localRetencaoQtd: inteiro(entrada.localRetencaoQtd, 0, 1000, atual.localRetencaoQtd),
    localRetencaoDias: inteiro(entrada.localRetencaoDias, 0, 3650, atual.localRetencaoDias),

    nuvemAtivo: booleano(entrada.nuvemAtivo, atual.nuvemAtivo),
    nuvemModo: modo(entrada.nuvemModo, atual.nuvemModo as ModoAgenda),
    nuvemIntervaloHoras: inteiro(entrada.nuvemIntervaloHoras, 1, 24 * 30, atual.nuvemIntervaloHoras),
    nuvemHorarios: normalizarHorarios(entrada.nuvemHorarios) ?? atual.nuvemHorarios,
    nuvemDiasSemana: normalizarDiasSemana(entrada.nuvemDiasSemana) ?? atual.nuvemDiasSemana,
    nuvemRetencaoQtd: inteiro(entrada.nuvemRetencaoQtd, 0, 1000, atual.nuvemRetencaoQtd),
    nuvemRetencaoDias: inteiro(entrada.nuvemRetencaoDias, 0, 3650, atual.nuvemRetencaoDias),

    driveFolderId:
      typeof entrada.driveFolderId === 'string'
        ? entrada.driveFolderId.trim() || null
        : atual.driveFolderId,
    driveFolderNome:
      typeof entrada.driveFolderNome === 'string'
        ? entrada.driveFolderNome.trim() || null
        : atual.driveFolderNome,
  }

  if (!dados.incluirBanco && !dados.incluirMidias) {
    throw new Error('Selecione pelo menos um conteudo para o backup: banco de dados ou midias.')
  }

  return prisma.backupConfig.update({ where: { id: ID_CONFIG }, data: dados })
}
