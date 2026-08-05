import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdmin, respostaDeErro, serializarJob } from '@/lib/admin-guard'
import { FUSO, getBackupConfig, type ModoAgenda } from '@/lib/backup/config'
import * as drive from '@/lib/backup/drive'
import { lockEmMemoria } from '@/lib/backup/lock'
import { ensureBackupDirs, espacoLivreBytes, getBackupDir, getRaizesMidia } from '@/lib/backup/paths'
import { agendadorHabilitado, proximoDisparoPrevisto } from '@/lib/backup/scheduler'

export const dynamic = 'force-dynamic'

export async function GET() {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const config = await getBackupConfig()
    const agora = new Date()

    const [ultimoLocal, ultimoNuvem, emAndamento, conta] = await Promise.all([
      prisma.backupJob.findFirst({
        where: { tipo: 'LOCAL', status: { in: ['SUCESSO', 'DUPLICADO'] } },
        orderBy: { iniciadoEm: 'desc' },
      }),
      prisma.backupJob.findFirst({
        where: { tipo: 'NUVEM', status: { in: ['SUCESSO', 'DUPLICADO'] } },
        orderBy: { iniciadoEm: 'desc' },
      }),
      prisma.backupJob.findMany({ where: { status: 'EXECUTANDO' }, orderBy: { iniciadoEm: 'desc' } }),
      drive.getContaAtiva(),
    ])

    const proximaLocal = config.localAtivo
      ? proximoDisparoPrevisto(
          config.localModo as ModoAgenda,
          {
            intervaloHoras: config.localIntervaloHoras,
            horarios: config.localHorarios,
            diasSemana: config.localDiasSemana,
          },
          agora,
          ultimoLocal?.iniciadoEm ?? null
        )
      : null

    const proximaNuvem = config.nuvemAtivo
      ? proximoDisparoPrevisto(
          config.nuvemModo as ModoAgenda,
          {
            intervaloHoras: config.nuvemIntervaloHoras,
            horarios: config.nuvemHorarios,
            diasSemana: config.nuvemDiasSemana,
          },
          agora,
          ultimoNuvem?.iniciadoEm ?? null
        )
      : null

    let espacoLivre: number | null = null
    let erroDiretorio: string | null = null
    let diretorio: string | null = null
    try {
      // Cria a pasta na primeira visita: antes disso o statfs falharia com ENOENT.
      const dirs = await ensureBackupDirs()
      diretorio = dirs.backupDir
      espacoLivre = await espacoLivreBytes()
    } catch (erro) {
      diretorio = diretorio ?? (() => {
        try {
          return getBackupDir()
        } catch {
          return null
        }
      })()
      erroDiretorio = (erro as Error).message
    }

    return NextResponse.json({
      config,
      fuso: FUSO,
      agendadorAtivo: agendadorHabilitado(),
      diretorio,
      erroDiretorio,
      espacoLivre,
      pastasMidia: getRaizesMidia().map((r) => r.absPath),
      emAndamento: emAndamento.map(serializarJob),
      lock: lockEmMemoria(),
      ultimoLocal: ultimoLocal ? serializarJob(ultimoLocal) : null,
      ultimoNuvem: ultimoNuvem ? serializarJob(ultimoNuvem) : null,
      proximaLocal: proximaLocal?.toISOString() ?? null,
      proximaNuvem: proximaNuvem?.toISOString() ?? null,
      drive: conta
        ? {
            conectado: true,
            email: conta.email,
            escopo: conta.escopo,
            conectadoEm: conta.conectadoEm.toISOString(),
            ultimoUsoEm: conta.ultimoUsoEm?.toISOString() ?? null,
            ultimoErro: conta.ultimoErro,
            quotaTotal: conta.quotaTotal ? Number(conta.quotaTotal) : null,
            quotaUsada: conta.quotaUsada ? Number(conta.quotaUsada) : null,
          }
        : { conectado: false },
    })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
