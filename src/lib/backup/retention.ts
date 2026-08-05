/**
 * Politica de retencao: por quantidade e por idade, independente para local e nuvem.
 * O backup mais recente bem-sucedido nunca e removido, mesmo que a regra mande.
 */

import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '@/lib/prisma'
import { getBackupConfig } from './config'
import * as drive from './drive'
import { getBackupDir, PREFIXO_ARQUIVO } from './paths'

export interface RelatorioRetencao {
  removidos: string[]
  mantidos: number
  motivos: string[]
}

const STATUS_COM_ARQUIVO = ['SUCESSO', 'DUPLICADO']

export async function aplicarRetencaoLocal(): Promise<RelatorioRetencao> {
  const config = await getBackupConfig()
  const relatorio: RelatorioRetencao = { removidos: [], mantidos: 0, motivos: [] }

  const jobs = await prisma.backupJob.findMany({
    where: { tipo: 'LOCAL', status: { in: STATUS_COM_ARQUIVO }, caminhoLocal: { not: null } },
    orderBy: { iniciadoEm: 'desc' },
  })

  const limiteIdade =
    config.localRetencaoDias > 0 ? Date.now() - config.localRetencaoDias * 24 * 60 * 60 * 1000 : null

  const emUso = new Set<string>()
  const paraRemover: typeof jobs = []

  jobs.forEach((job, indice) => {
    if (indice === 0) {
      // Sempre preserva o backup mais recente.
      if (job.caminhoLocal) emUso.add(job.caminhoLocal)
      relatorio.mantidos += 1
      return
    }

    const excedeQtd = config.localRetencaoQtd > 0 && indice >= config.localRetencaoQtd
    const excedeIdade = limiteIdade !== null && job.iniciadoEm.getTime() < limiteIdade

    if (excedeQtd || excedeIdade) {
      paraRemover.push(job)
      relatorio.motivos.push(
        `${job.arquivo ?? job.id}: ${excedeQtd ? 'excedeu a quantidade' : 'excedeu a idade'} configurada`
      )
    } else {
      if (job.caminhoLocal) emUso.add(job.caminhoLocal)
      relatorio.mantidos += 1
    }
  })

  for (const job of paraRemover) {
    let removeuArquivo = false

    if (job.caminhoLocal && !emUso.has(job.caminhoLocal)) {
      // So conta como remocao o que realmente existia: jobs antigos podem apontar
      // para arquivos que ja sumiram (disco limpo na mao, servidor trocado etc.).
      const existia = await fs.promises
        .stat(job.caminhoLocal)
        .then(() => true)
        .catch(() => false)

      if (existia) {
        await fs.promises.rm(job.caminhoLocal, { force: true }).catch(() => undefined)
        relatorio.removidos.push(job.arquivo ?? job.caminhoLocal)
        removeuArquivo = true
      }
    }

    await prisma.backupJob.update({
      where: { id: job.id },
      data: {
        caminhoLocal: null,
        log: removeuArquivo
          ? `${job.log ?? ''}\nArquivo local removido pela politica de retencao em ${new Date().toISOString()}.`.trim()
          : `${job.log ?? ''}\nArquivo local ja nao estava no disco (registro atualizado em ${new Date().toISOString()}).`.trim(),
      },
    })
  }

  await removerOrfaos(emUso, relatorio)
  return relatorio
}

/** Remove pacotes soltos no diretorio que nao pertencem a nenhum job conhecido. */
async function removerOrfaos(emUso: Set<string>, relatorio: RelatorioRetencao): Promise<void> {
  const dir = getBackupDir()

  let entradas: string[]
  try {
    entradas = await fs.promises.readdir(dir)
  } catch {
    return
  }

  const conhecidos = new Set(
    (
      await prisma.backupJob.findMany({
        where: { caminhoLocal: { not: null } },
        select: { caminhoLocal: true },
      })
    )
      .map((j) => j.caminhoLocal)
      .filter((c): c is string => Boolean(c))
  )

  for (const entrada of entradas) {
    if (!entrada.startsWith(`${PREFIXO_ARQUIVO}-`) || !entrada.endsWith('.tar.gz')) continue

    const completo = path.join(dir, entrada)
    if (conhecidos.has(completo) || emUso.has(completo)) continue

    // Margem de seguranca: nao mexe em arquivos criados ha menos de 1 hora
    // (pode ser um backup em andamento em outro processo).
    const info = await fs.promises.stat(completo).catch(() => null)
    if (!info || Date.now() - info.mtimeMs < 60 * 60 * 1000) continue

    await fs.promises.rm(completo, { force: true }).catch(() => undefined)
    relatorio.removidos.push(entrada)
    relatorio.motivos.push(`${entrada}: arquivo orfao, sem registro no historico`)
  }
}

export async function aplicarRetencaoNuvem(): Promise<RelatorioRetencao> {
  const config = await getBackupConfig()
  const relatorio: RelatorioRetencao = { removidos: [], mantidos: 0, motivos: [] }

  if (!config.driveFolderId) return relatorio
  const conta = await drive.getContaAtiva()
  if (!conta) return relatorio

  const arquivos = await drive.listarBackups(config.driveFolderId)
  arquivos.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())

  const limiteIdade =
    config.nuvemRetencaoDias > 0 ? Date.now() - config.nuvemRetencaoDias * 24 * 60 * 60 * 1000 : null

  for (let indice = 0; indice < arquivos.length; indice++) {
    const arquivo = arquivos[indice]

    if (indice === 0) {
      relatorio.mantidos += 1
      continue
    }

    const excedeQtd = config.nuvemRetencaoQtd > 0 && indice >= config.nuvemRetencaoQtd
    const excedeIdade = limiteIdade !== null && new Date(arquivo.criadoEm).getTime() < limiteIdade

    if (!excedeQtd && !excedeIdade) {
      relatorio.mantidos += 1
      continue
    }

    await drive.excluirArquivo(arquivo.id)
    relatorio.removidos.push(arquivo.nome)
    relatorio.motivos.push(
      `${arquivo.nome}: ${excedeQtd ? 'excedeu a quantidade' : 'excedeu a idade'} configurada na nuvem`
    )

    await prisma.backupJob.updateMany({
      where: { driveFileId: arquivo.id },
      data: { driveFileId: null },
    })
  }

  return relatorio
}
