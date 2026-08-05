/**
 * Trava de execucao: garante um backup por vez.
 *
 * Dois niveis: memoria (mesmo processo, sobrevive ao HMR do dev) e arquivo
 * <BACKUP_DIR>/.lock (cobre restart do pm2 e mais de uma instancia no mesmo servidor).
 * Uma trava com mais de MAX_IDADE_MS e considerada orfa e e derrubada.
 */

import fs from 'node:fs'
import { ensureBackupDirs, getLockFile } from './paths'

const MAX_IDADE_MS = 2 * 60 * 60 * 1000

const chaveEstado = Symbol.for('portal-transparencia.backup-lock')
interface EstadoLock {
  ativo: { jobId: string; desde: number } | null
}

const globalLock = globalThis as typeof globalThis & { [chaveEstado]?: EstadoLock }
if (!globalLock[chaveEstado]) globalLock[chaveEstado] = { ativo: null }
const estado = globalLock[chaveEstado]

export class BackupEmAndamentoError extends Error {
  readonly jobId: string
  readonly desde: Date

  constructor(jobId: string, desde: Date) {
    super(`Ja existe um backup em andamento (${jobId}) iniciado em ${desde.toISOString()}.`)
    this.name = 'BackupEmAndamentoError'
    this.jobId = jobId
    this.desde = desde
  }
}

interface ConteudoLock {
  jobId: string
  pid: number
  desde: number
}

export function lockEmMemoria(): { jobId: string; desde: number } | null {
  return estado.ativo
}

export async function adquirirLock(jobId: string): Promise<() => Promise<void>> {
  if (estado.ativo && Date.now() - estado.ativo.desde < MAX_IDADE_MS) {
    throw new BackupEmAndamentoError(estado.ativo.jobId, new Date(estado.ativo.desde))
  }

  await ensureBackupDirs()
  const arquivo = getLockFile()
  const conteudo: ConteudoLock = { jobId, pid: process.pid, desde: Date.now() }

  try {
    // wx falha se o arquivo ja existir: e a operacao atomica que garante exclusao mutua.
    await fs.promises.writeFile(arquivo, JSON.stringify(conteudo), { flag: 'wx' })
  } catch (erro) {
    if ((erro as NodeJS.ErrnoException).code !== 'EEXIST') throw erro

    let anterior: ConteudoLock | null = null
    try {
      anterior = JSON.parse(await fs.promises.readFile(arquivo, 'utf8')) as ConteudoLock
    } catch {
      anterior = null
    }

    const idade = anterior ? Date.now() - anterior.desde : Number.POSITIVE_INFINITY
    const processoVivo = anterior ? pidVivo(anterior.pid) : false

    if (anterior && idade < MAX_IDADE_MS && (processoVivo || anterior.pid !== process.pid)) {
      if (processoVivo || idade < 5 * 60 * 1000) {
        throw new BackupEmAndamentoError(anterior.jobId, new Date(anterior.desde))
      }
    }

    // Trava orfa (processo morto ou antiga demais): assume o controle.
    await fs.promises.writeFile(arquivo, JSON.stringify(conteudo))
  }

  estado.ativo = { jobId, desde: conteudo.desde }

  let liberado = false
  return async () => {
    if (liberado) return
    liberado = true
    estado.ativo = null
    try {
      const atual = JSON.parse(await fs.promises.readFile(arquivo, 'utf8')) as ConteudoLock
      if (atual.jobId === jobId) await fs.promises.rm(arquivo, { force: true })
    } catch {
      await fs.promises.rm(arquivo, { force: true }).catch(() => undefined)
    }
  }
}

function pidVivo(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false
  if (pid === process.pid) return true
  try {
    process.kill(pid, 0)
    return true
  } catch (erro) {
    return (erro as NodeJS.ErrnoException).code === 'EPERM'
  }
}
