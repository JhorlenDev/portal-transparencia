/**
 * Orquestracao de um backup: trava, dump do banco, inventario de midias,
 * empacotamento, deduplicacao, envio ao Drive e retencao.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { BackupJob } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  adicionarAoStaging,
  criarStaging,
  empacotar,
  limparStaging,
  listarPacote,
  type ResultadoPacote,
} from './archive'
import { FUSO, getBackupConfig, type DestinoBackup, type EscopoBackup } from './config'
import { dumpDatabase, type DumpStats } from './db-dump'
import * as drive from './drive'
import { adquirirLock } from './lock'
import { inventariarMidias, type InventarioMidia } from './media'
import { ensureBackupDirs, espacoLivreBytes, getBackupDir, nomeArquivoDisponivel } from './paths'
import { aplicarRetencaoLocal, aplicarRetencaoNuvem } from './retention'

export const VERSAO_MANIFESTO = 1
/** Folga exigida em disco alem do tamanho estimado do pacote. */
function margemDiscoBytes(): number {
  return Number(process.env.BACKUP_MARGEM_DISCO_BYTES ?? 128 * 1024 * 1024)
}

/** Acima desse tamanho, o pacote nao e relido para verificacao (custaria uma segunda passada). */
function limiteVerificacaoBytes(): number {
  return Number(process.env.BACKUP_LIMITE_VERIFICACAO ?? 512 * 1024 * 1024)
}
const MAX_LOG_CHARS = 60_000

export interface OpcoesExecucao {
  escopo?: EscopoBackup
  destino?: DestinoBackup
  origem?: 'MANUAL' | 'AGENDADO'
  /** Pula a deduplicacao, forcando a geracao de um pacote novo. */
  forcar?: boolean
}

export interface ResultadoExecucao {
  jobs: BackupJob[]
  arquivo: string | null
  contentHash: string
  duplicado: boolean
  avisos: string[]
}

class Diario {
  private readonly linhas: string[] = []

  add(mensagem: string): void {
    const carimbo = new Date().toLocaleTimeString('pt-BR', { timeZone: FUSO, hour12: false })
    this.linhas.push(`[${carimbo}] ${mensagem}`)
  }

  texto(): string {
    const completo = this.linhas.join('\n')
    return completo.length > MAX_LOG_CHARS ? `${completo.slice(0, MAX_LOG_CHARS)}\n... (log truncado)` : completo
  }
}

function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const unidades = ['KB', 'MB', 'GB', 'TB']
  let valor = bytes / 1024
  let i = 0
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024
    i += 1
  }
  return `${valor.toFixed(valor >= 100 ? 0 : 1)} ${unidades[i]}`
}

function calcularContentHash(shaDump: string | null, inventario: InventarioMidia | null): string {
  const hash = crypto.createHash('sha256')
  hash.update(`db:${shaDump ?? 'nenhum'}\n`)
  for (const arquivo of inventario?.arquivos ?? []) {
    hash.update(`${arquivo.entryPath}:${arquivo.sha256}\n`)
  }
  return hash.digest('hex')
}

async function existeArquivo(caminho: string | null | undefined): Promise<boolean> {
  if (!caminho) return false
  try {
    await fs.promises.access(caminho, fs.constants.R_OK)
    return true
  } catch {
    return false
  }
}

export async function executarBackup(opcoes: OpcoesExecucao = {}): Promise<ResultadoExecucao> {
  const escopo = opcoes.escopo ?? 'COMPLETO'
  const destino = opcoes.destino ?? 'LOCAL'
  const origem = opcoes.origem ?? 'MANUAL'
  const runId = crypto.randomUUID()
  const diario = new Diario()
  const inicio = Date.now()

  const liberarLock = await adquirirLock(runId)

  const config = await getBackupConfig()
  const incluirBanco = escopo === 'BANCO' || (escopo === 'COMPLETO' && config.incluirBanco)
  const incluirMidias = escopo === 'MIDIAS' || (escopo === 'COMPLETO' && config.incluirMidias)

  if (!incluirBanco && !incluirMidias) {
    await liberarLock()
    throw new Error('Nada a fazer: banco e midias estao desativados na configuracao.')
  }

  const jobsCriados: BackupJob[] = []
  let stagingDir: string | null = null
  let caminhoFinal: string | null = null
  let arquivoReutilizado = false
  let pacoteInfo: ResultadoPacote | null = null

  const jobLocal = destino === 'LOCAL' || destino === 'AMBOS'
    ? await prisma.backupJob.create({ data: { tipo: 'LOCAL', origem, escopo, status: 'EXECUTANDO' } })
    : null

  const jobNuvem = destino === 'NUVEM' || destino === 'AMBOS'
    ? await prisma.backupJob.create({ data: { tipo: 'NUVEM', origem, escopo, status: 'EXECUTANDO' } })
    : null

  if (jobLocal) jobsCriados.push(jobLocal)
  if (jobNuvem) jobsCriados.push(jobNuvem)

  const finalizarComErro = async (erro: unknown) => {
    const mensagem = erro instanceof Error ? erro.message : String(erro)
    diario.add(`ERRO: ${mensagem}`)

    // Backup exclusivo de nuvem que falhou no envio deixaria um pacote no disco sem
    // nenhum job apontando para ele — lixo invisivel na interface.
    if (!jobLocal && !arquivoReutilizado && caminhoFinal) {
      await fs.promises.rm(caminhoFinal, { force: true }).catch(() => undefined)
      diario.add('Pacote local temporario removido apos a falha no envio.')
    }

    for (const job of jobsCriados) {
      await prisma.backupJob
        .update({
          where: { id: job.id },
          data: {
            status: 'ERRO',
            erro: mensagem.slice(0, 4000),
            log: diario.texto(),
            finalizadoEm: new Date(),
            duracaoMs: Date.now() - inicio,
          },
        })
        .catch(() => undefined)
    }
  }

  try {
    await ensureBackupDirs()
    stagingDir = await criarStaging(runId)
    diario.add(`Backup ${escopo} iniciado (destino: ${destino}, origem: ${origem}).`)

    // ------------------------------------------------------------ banco
    let statsDump: DumpStats | null = null
    let shaDump: string | null = null
    let bytesDump = 0

    if (incluirBanco) {
      const caminhoDump = path.join(stagingDir, 'database', 'dump.sql')
      await fs.promises.mkdir(path.dirname(caminhoDump), { recursive: true })

      const hashDump = crypto.createHash('sha256')
      const saida = fs.createWriteStream(caminhoDump)
      const original = saida.write.bind(saida)
      saida.write = ((parte: string | Buffer, ...resto: unknown[]) => {
        hashDump.update(typeof parte === 'string' ? Buffer.from(parte) : parte)
        return (original as (p: string | Buffer, ...r: unknown[]) => boolean)(parte, ...resto)
      }) as typeof saida.write

      statsDump = await dumpDatabase(saida)
      await new Promise<void>((resolve, reject) => {
        saida.end(() => resolve())
        saida.once('error', reject)
      })

      shaDump = hashDump.digest('hex')
      bytesDump = (await fs.promises.stat(caminhoDump)).size

      diario.add(
        `Banco: ${statsDump.tabelas.length} tabela(s), ${statsDump.totalRegistros} registro(s), ` +
          `dump de ${formatarBytes(bytesDump)}.`
      )
      for (const aviso of statsDump.avisos) diario.add(`Aviso: ${aviso}`)
    }

    // ------------------------------------------------------------ midias
    let inventario: InventarioMidia | null = null

    if (incluirMidias) {
      inventario = await inventariarMidias()
      diario.add(
        `Midias: ${inventario.arquivos.length} arquivo(s), ${formatarBytes(inventario.totalBytes)} ` +
          `em ${inventario.raizes.length} pasta(s).`
      )
      for (const aviso of inventario.avisos) diario.add(`Aviso: ${aviso}`)

      let links = 0
      let copias = 0
      const perdidos: string[] = []

      for (const arquivo of inventario.arquivos) {
        try {
          const modo = await adicionarAoStaging(stagingDir, arquivo.absPath, arquivo.entryPath)
          if (modo === 'link') links += 1
          else copias += 1
        } catch (erro) {
          const codigo = (erro as NodeJS.ErrnoException).code
          if (codigo === 'ENOENT') {
            perdidos.push(arquivo.entryPath)
            continue
          }
          throw erro
        }
      }

      if (perdidos.length > 0) {
        diario.add(`Aviso: ${perdidos.length} arquivo(s) sumiram durante o empacotamento e foram ignorados.`)
        inventario.arquivos = inventario.arquivos.filter((a) => !perdidos.includes(a.entryPath))
        inventario.totalBytes = inventario.arquivos.reduce((soma, a) => soma + a.tamanho, 0)
        inventario.avisos.push(...perdidos.map((p) => `Arquivo removido durante o empacotamento: ${p}`))
      }

      if (copias > 0) diario.add(`Staging: ${links} hardlink(s) e ${copias} copia(s).`)
    }

    // ------------------------------------------------------------ dedupe
    const contentHash = calcularContentHash(shaDump, inventario)
    diario.add(`Impressao digital do conteudo: ${contentHash.slice(0, 16)}...`)

    const anterior = opcoes.forcar || !config.pularDuplicados
      ? null
      : await prisma.backupJob.findFirst({
          where: { tipo: 'LOCAL', escopo, contentHash, status: { in: ['SUCESSO', 'DUPLICADO'] }, caminhoLocal: { not: null } },
          orderBy: { iniciadoEm: 'desc' },
        })

    if (anterior && (await existeArquivo(anterior.caminhoLocal))) {
      caminhoFinal = anterior.caminhoLocal
      arquivoReutilizado = true
      diario.add(`Conteudo identico ao backup ${anterior.arquivo}: pacote reaproveitado, sem gerar arquivo novo.`)
    }

    // ------------------------------------------------------------ manifesto + pacote
    const totalConteudo = bytesDump + (inventario?.totalBytes ?? 0)

    if (!caminhoFinal) {
      const manifesto = {
        versao: VERSAO_MANIFESTO,
        app: 'portal-transparencia',
        gerado_em: new Date().toISOString(),
        escopo,
        content_hash: contentHash,
        banco: statsDump
          ? {
              nome: statsDump.banco,
              versao_servidor: statsDump.versaoServidor,
              total_registros: statsDump.totalRegistros,
              bytes_dump: bytesDump,
              sha256_dump: shaDump,
              tabelas: statsDump.tabelas,
              views: statsDump.views,
            }
          : null,
        midias: inventario
          ? {
              total_arquivos: inventario.arquivos.length,
              total_bytes: inventario.totalBytes,
              raizes: inventario.raizes,
              arquivos: inventario.arquivos.map((a) => ({
                caminho: a.entryPath,
                tamanho: a.tamanho,
                sha256: a.sha256,
              })),
            }
          : null,
        avisos: [...(statsDump?.avisos ?? []), ...(inventario?.avisos ?? [])],
      }

      await fs.promises.writeFile(
        path.join(stagingDir, 'manifest.json'),
        JSON.stringify(manifesto, null, 2),
        'utf8'
      )

      const livre = await espacoLivreBytes()
      const necessario = totalConteudo + margemDiscoBytes()
      if (livre < necessario) {
        throw new Error(
          `Espaco em disco insuficiente para gerar o backup: ${formatarBytes(livre)} livre(s), ` +
            `sao necessarios ao menos ${formatarBytes(necessario)}.`
        )
      }

      const entradas = ['manifest.json']
      if (incluirBanco) entradas.push('database')
      if (incluirMidias && (inventario?.arquivos.length ?? 0) > 0) entradas.push('media')

      const nomeArquivo = await nomeArquivoDisponivel(escopo, new Date())
      const destinoTmp = path.join(stagingDir, nomeArquivo)

      diario.add('Empacotando (tar.gz)...')
      const pacote = await empacotar(stagingDir, destinoTmp, entradas)
      pacoteInfo = pacote

      const destinoFinal = path.join(getBackupDir(), nomeArquivo)
      await fs.promises.rename(destinoTmp, destinoFinal)
      caminhoFinal = destinoFinal

      diario.add(
        `Pacote gerado: ${nomeArquivo} (${formatarBytes(pacote.tamanhoBytes)}, sha256 ${pacote.sha256.slice(0, 16)}...).`
      )

      if (pacote.tamanhoBytes <= limiteVerificacaoBytes()) {
        const membros = await listarPacote(destinoFinal)
        if (!membros.includes('manifest.json')) {
          throw new Error('Verificacao do pacote falhou: manifest.json nao encontrado dentro do .tar.gz.')
        }
        diario.add(`Verificacao: ${membros.length} entrada(s) legiveis no pacote.`)
      } else {
        diario.add('Verificacao completa pulada (pacote grande); integridade garantida pelo sha256.')
      }
    }

    const infoArquivo = await fs.promises.stat(caminhoFinal)
    const shaPacote = pacoteInfo?.sha256 ?? anterior?.sha256 ?? null
    const nomeFinal = path.basename(caminhoFinal)

    // ------------------------------------------------------------ job local
    if (jobLocal) {
      const atualizado = await prisma.backupJob.update({
        where: { id: jobLocal.id },
        data: {
          status: arquivoReutilizado ? 'DUPLICADO' : 'SUCESSO',
          arquivo: nomeFinal,
          tamanhoBytes: BigInt(infoArquivo.size),
          sha256: shaPacote,
          contentHash,
          caminhoLocal: caminhoFinal,
          duplicadoDeId: arquivoReutilizado ? anterior?.id ?? null : null,
          totalTabelas: statsDump?.tabelas.length ?? null,
          totalRegistros: statsDump?.totalRegistros ?? null,
          totalArquivos: inventario?.arquivos.length ?? null,
          finalizadoEm: new Date(),
          duracaoMs: Date.now() - inicio,
          log: diario.texto(),
        },
      })
      jobsCriados[jobsCriados.indexOf(jobLocal)] = atualizado
    }

    // ------------------------------------------------------------ job nuvem
    if (jobNuvem) {
      const conta = await drive.getContaAtiva()
      if (!conta) throw new drive.DriveNaoConectadoError()
      if (!config.driveFolderId) {
        throw new Error('Escolha uma pasta do Google Drive antes de enviar backups para a nuvem.')
      }

      const jaNoDrive = config.pularDuplicados && !opcoes.forcar
        ? await drive.buscarPorContentHash(config.driveFolderId, contentHash)
        : null

      if (jaNoDrive) {
        diario.add(`Conteudo identico ja esta no Drive (${jaNoDrive.nome}): envio dispensado.`)
        const atualizado = await prisma.backupJob.update({
          where: { id: jobNuvem.id },
          data: {
            status: 'DUPLICADO',
            arquivo: jaNoDrive.nome,
            tamanhoBytes: BigInt(jaNoDrive.tamanho || infoArquivo.size),
            sha256: jaNoDrive.sha256 ?? shaPacote,
            contentHash,
            driveFileId: jaNoDrive.id,
            driveFolderId: config.driveFolderId,
            totalTabelas: statsDump?.tabelas.length ?? null,
            totalRegistros: statsDump?.totalRegistros ?? null,
            totalArquivos: inventario?.arquivos.length ?? null,
            finalizadoEm: new Date(),
            duracaoMs: Date.now() - inicio,
            log: diario.texto(),
          },
        })
        jobsCriados[jobsCriados.indexOf(jobNuvem)] = atualizado
      } else {
        diario.add(`Enviando ${nomeFinal} (${formatarBytes(infoArquivo.size)}) para o Google Drive...`)
        const enviado = await drive.enviarArquivo({
          caminho: caminhoFinal,
          nome: nomeFinal,
          folderId: config.driveFolderId,
          appProperties: {
            contentHash,
            escopo,
            ...(shaPacote ? { sha256: shaPacote } : {}),
          },
        })
        diario.add(`Enviado para o Drive (id ${enviado.id}).`)

        const atualizado = await prisma.backupJob.update({
          where: { id: jobNuvem.id },
          data: {
            status: 'SUCESSO',
            arquivo: nomeFinal,
            tamanhoBytes: BigInt(enviado.tamanho || infoArquivo.size),
            sha256: shaPacote,
            contentHash,
            driveFileId: enviado.id,
            driveFolderId: config.driveFolderId,
            totalTabelas: statsDump?.tabelas.length ?? null,
            totalRegistros: statsDump?.totalRegistros ?? null,
            totalArquivos: inventario?.arquivos.length ?? null,
            finalizadoEm: new Date(),
            duracaoMs: Date.now() - inicio,
            log: diario.texto(),
          },
        })
        jobsCriados[jobsCriados.indexOf(jobNuvem)] = atualizado
      }
    }

    // ------------------------------------------------------------ limpeza e retencao
    if (!jobLocal && !arquivoReutilizado) {
      // Backup so para a nuvem nao deve ocupar disco.
      await fs.promises.rm(caminhoFinal, { force: true })
      diario.add('Copia local temporaria removida (backup exclusivo de nuvem).')
      caminhoFinal = null
      if (jobNuvem) {
        await prisma.backupJob.update({ where: { id: jobNuvem.id }, data: { log: diario.texto() } })
      }
    }

    const relatorioLocal = jobLocal ? await aplicarRetencaoLocal() : null
    if (relatorioLocal && relatorioLocal.removidos.length > 0) {
      diario.add(`Retencao local: ${relatorioLocal.removidos.length} pacote(s) antigo(s) removido(s).`)
    }

    const relatorioNuvem = jobNuvem ? await aplicarRetencaoNuvem().catch((erro) => {
      diario.add(`Aviso: retencao na nuvem falhou (${(erro as Error).message}).`)
      return null
    }) : null
    if (relatorioNuvem && relatorioNuvem.removidos.length > 0) {
      diario.add(`Retencao na nuvem: ${relatorioNuvem.removidos.length} arquivo(s) removido(s) do Drive.`)
    }

    for (const job of jobsCriados) {
      await prisma.backupJob.update({ where: { id: job.id }, data: { log: diario.texto() } }).catch(() => undefined)
    }

    const finais = await prisma.backupJob.findMany({
      where: { id: { in: jobsCriados.map((j) => j.id) } },
      orderBy: { tipo: 'asc' },
    })

    return {
      jobs: finais,
      arquivo: caminhoFinal,
      contentHash,
      duplicado: finais.every((j) => j.status === 'DUPLICADO'),
      avisos: [...(statsDump?.avisos ?? []), ...(inventario?.avisos ?? [])],
    }
  } catch (erro) {
    await finalizarComErro(erro)
    throw erro
  } finally {
    if (stagingDir) await limparStaging(stagingDir)
    await liberarLock()
  }
}

/** Envia para o Drive um pacote que ja existe no disco. */
export async function enviarJobParaDrive(jobId: string): Promise<BackupJob> {
  const job = await prisma.backupJob.findUnique({ where: { id: jobId } })
  if (!job) throw new Error('Backup nao encontrado.')
  if (!job.caminhoLocal || !(await existeArquivo(job.caminhoLocal))) {
    throw new Error('O arquivo local desse backup nao esta mais disponivel.')
  }

  const config = await getBackupConfig()
  if (!config.driveFolderId) throw new Error('Escolha uma pasta do Google Drive antes de enviar.')

  const contentHash = job.contentHash ?? ''
  const existente = contentHash ? await drive.buscarPorContentHash(config.driveFolderId, contentHash) : null

  const novo = await prisma.backupJob.create({
    data: {
      tipo: 'NUVEM',
      origem: 'MANUAL',
      escopo: job.escopo,
      status: 'EXECUTANDO',
      arquivo: job.arquivo,
      contentHash: job.contentHash,
      sha256: job.sha256,
      tamanhoBytes: job.tamanhoBytes,
      driveFolderId: config.driveFolderId,
    },
  })

  const inicio = Date.now()

  try {
    if (existente) {
      return await prisma.backupJob.update({
        where: { id: novo.id },
        data: {
          status: 'DUPLICADO',
          driveFileId: existente.id,
          duplicadoDeId: job.id,
          finalizadoEm: new Date(),
          duracaoMs: Date.now() - inicio,
          log: `Conteudo identico ja estava no Drive como ${existente.nome}: envio dispensado.`,
        },
      })
    }

    const enviado = await drive.enviarArquivo({
      caminho: job.caminhoLocal,
      nome: job.arquivo ?? path.basename(job.caminhoLocal),
      folderId: config.driveFolderId,
      appProperties: {
        ...(job.contentHash ? { contentHash: job.contentHash } : {}),
        escopo: job.escopo,
        ...(job.sha256 ? { sha256: job.sha256 } : {}),
      },
    })

    const atualizado = await prisma.backupJob.update({
      where: { id: novo.id },
      data: {
        status: 'SUCESSO',
        driveFileId: enviado.id,
        tamanhoBytes: BigInt(enviado.tamanho),
        finalizadoEm: new Date(),
        duracaoMs: Date.now() - inicio,
        log: `Enviado manualmente para o Drive (id ${enviado.id}).`,
      },
    })

    await aplicarRetencaoNuvem().catch(() => undefined)
    return atualizado
  } catch (erro) {
    await prisma.backupJob.update({
      where: { id: novo.id },
      data: {
        status: 'ERRO',
        erro: (erro as Error).message.slice(0, 4000),
        finalizadoEm: new Date(),
        duracaoMs: Date.now() - inicio,
      },
    })
    throw erro
  }
}

/** Traz de volta para o disco um pacote que so existe no Drive. */
export async function puxarDoDrive(jobId: string): Promise<BackupJob> {
  const job = await prisma.backupJob.findUnique({ where: { id: jobId } })
  if (!job) throw new Error('Backup nao encontrado.')
  if (!job.driveFileId) throw new Error('Esse backup nao tem copia no Google Drive.')

  if (job.caminhoLocal && (await existeArquivo(job.caminhoLocal))) {
    return job
  }

  await ensureBackupDirs()
  const nome = job.arquivo ?? `${job.id}.tar.gz`
  const destino = path.join(getBackupDir(), nome)

  const { tamanho } = await drive.baixarArquivo(job.driveFileId, destino)

  const { sha256De } = await import('./archive')
  const sha = await sha256De(destino)

  if (job.sha256 && job.sha256 !== sha) {
    await fs.promises.rm(destino, { force: true })
    throw new Error(
      `O arquivo baixado do Drive nao confere com o backup original (sha256 esperado ${job.sha256.slice(0, 16)}..., obtido ${sha.slice(0, 16)}...).`
    )
  }

  return prisma.backupJob.update({
    where: { id: job.id },
    data: {
      caminhoLocal: destino,
      tamanhoBytes: BigInt(tamanho),
      sha256: job.sha256 ?? sha,
      log: `${job.log ?? ''}\nArquivo trazido do Drive em ${new Date().toISOString()}.`.trim(),
    },
  })
}

export async function excluirJob(jobId: string, apagarNoDrive = false): Promise<void> {
  const job = await prisma.backupJob.findUnique({ where: { id: jobId } })
  if (!job) return

  if (job.caminhoLocal) {
    // Nao apaga o arquivo se outro job ainda aponta para ele (pacotes reaproveitados).
    const outros = await prisma.backupJob.count({
      where: { caminhoLocal: job.caminhoLocal, id: { not: job.id } },
    })
    if (outros === 0) await fs.promises.rm(job.caminhoLocal, { force: true }).catch(() => undefined)
  }

  if (apagarNoDrive && job.driveFileId) {
    await drive.excluirArquivo(job.driveFileId).catch(() => undefined)
  }

  await prisma.backupJob.delete({ where: { id: jobId } })
}
