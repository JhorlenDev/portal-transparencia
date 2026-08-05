#!/usr/bin/env npx tsx
/**
 * Testes do caminho de nuvem do backup.
 *
 * Por padrao roda contra um Google Drive simulado (scripts/mock-drive.ts), o que
 * permite exercitar envio em pedacos, queda de conexao no meio do upload, 429/503,
 * token vencido, deduplicacao, retencao e download sem depender de conta real.
 *
 * Com --real, roda um subconjunto seguro contra a conta que estiver conectada no
 * painel, criando uma pasta propria ("Portal Transparencia - teste").
 *
 * Uso:  npx tsx scripts/test-backup-drive.ts
 *       npx tsx scripts/test-backup-drive.ts --real
 */

import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { grupo, igual, resumo, resultados, teste, verificar } from './test-utils'

const MODO_REAL = process.argv.includes('--real')

const RAIZ = fs.mkdtempSync(path.join(os.tmpdir(), 'pt-backup-drive-'))
const DIR_BACKUPS = path.join(RAIZ, 'backups')
const DIR_MIDIAS = path.join(RAIZ, 'midias')

fs.mkdirSync(DIR_BACKUPS, { recursive: true })
fs.mkdirSync(DIR_MIDIAS, { recursive: true })

process.env.BACKUP_DIR = DIR_BACKUPS
process.env.BACKUP_MEDIA_DIRS = DIR_MIDIAS
process.env.BACKUP_SCHEDULER_ENABLED = 'false'

/** Cria uma midia de tamanho conhecido para controlar o tamanho do pacote. */
function criarMidia(nome: string, bytes: number): void {
  const bloco = crypto.randomBytes(Math.min(bytes, 1024 * 1024))
  const fd = fs.openSync(path.join(DIR_MIDIAS, nome), 'w')
  let escritos = 0
  while (escritos < bytes) {
    const pedaco = Math.min(bloco.length, bytes - escritos)
    bloco.writeUInt32LE(escritos % 0xffffffff, 0)
    fs.writeSync(fd, bloco, 0, pedaco)
    escritos += pedaco
  }
  fs.closeSync(fd)
}

async function main() {
  const marcoInicial = new Date()
  let codigoSaida = 0

  const { MockDrive } = await import('./mock-drive')
  const mock = new MockDrive()

  if (!MODO_REAL) {
    await mock.iniciar()
    process.env.BACKUPHUB_BASE_URL = mock.baseUrl
    process.env.GOOGLE_DRIVE_API_BASE = mock.apiBase
    process.env.GOOGLE_DRIVE_UPLOAD_BASE = mock.uploadBase
  }

  const { prisma } = await import('../src/lib/prisma')
  const { cifrarSegredo } = await import('../src/lib/backup/crypto')
  const drive = await import('../src/lib/backup/drive')
  const { executarBackup, puxarDoDrive, enviarJobParaDrive } = await import('../src/lib/backup/runner')
  const { aplicarRetencaoNuvem } = await import('../src/lib/backup/retention')
  const { sha256De } = await import('../src/lib/backup/archive')

  let contaTesteId: string | null = null
  let pastaId = ''

  try {
    // ---------------------------------------------------------- preparacao
    if (MODO_REAL) {
      const conta = await drive.getContaAtiva()
      if (!conta) {
        console.error('\nNenhuma conta do Google Drive conectada. Conecte em /admin/backup e rode de novo.')
        process.exit(1)
      }
      console.log(`\nModo REAL: usando a conta ${conta.email}.`)
      const pasta = await drive.garantirPasta('Portal Transparencia - teste')
      pastaId = pasta.id
      console.log(`Pasta de teste: ${pasta.nome} (${pasta.id})\n`)
    } else {
      const conta = await prisma.backupDriveConta.create({
        data: {
          email: 'teste@exemplo.com',
          escopo: 'DRIVE_FULL',
          tokenCifrado: cifrarSegredo('bk_live_token_de_teste'),
        },
      })
      contaTesteId = conta.id
      pastaId = mock.criarPasta('Backups do Portal').id
    }

    await prisma.backupConfig.upsert({
      where: { id: 'singleton' },
      update: {
        driveFolderId: pastaId,
        driveFolderNome: MODO_REAL ? 'Portal Transparencia - teste' : 'Backups do Portal',
        incluirBanco: false,
        incluirMidias: true,
        pularDuplicados: true,
        nuvemRetencaoQtd: 0,
        nuvemRetencaoDias: 0,
      },
      create: { id: 'singleton', driveFolderId: pastaId },
    })

    // ---------------------------------------------------------- 1. conexao
    grupo('1. Conexao e token')

    await teste('obtem access_token pelo broker', async () => {
      const token = await drive.getAccessToken(true)
      verificar(token.length > 10, 'token vazio')
      return `${token.slice(0, 12)}...`
    })

    await teste('token e reaproveitado do cache', async () => {
      const antes = MODO_REAL ? 0 : mock.estatisticas.chamadasToken
      await drive.getAccessToken()
      await drive.getAccessToken()
      if (!MODO_REAL) igual(mock.estatisticas.chamadasToken, antes, 'nao deveria pedir token de novo')
      return 'cache ok'
    })

    await teste('lista pastas do Drive', async () => {
      const pastas = await drive.listarPastas('root')
      verificar(Array.isArray(pastas), 'resposta invalida')
      return `${pastas.length} pasta(s) na raiz`
    })

    if (!MODO_REAL) {
      await teste('token vencido no Google e renovado automaticamente', async () => {
        mock.falhas.tokenVencidoUmaVez = true
        const antes = mock.estatisticas.chamadasToken

        let pastas
        try {
          pastas = await drive.listarPastas('root')
        } finally {
          mock.falhas.tokenVencidoUmaVez = false
        }

        verificar(Array.isArray(pastas), 'listagem falhou apos renovacao')
        verificar(mock.estatisticas.chamadasToken > antes, 'o token nao foi renovado')
        return `${mock.estatisticas.chamadasToken - antes} renovacao(oes)`
      })

      await teste('429 na listagem e repetido respeitando Retry-After', async () => {
        mock.falhas.status429NasListagens = mock.estatisticas.listagens + 1
        const inicio = Date.now()

        let pastas
        try {
          pastas = await drive.listarPastas('root')
        } finally {
          mock.falhas.status429NasListagens = 0
        }

        verificar(Array.isArray(pastas), 'listagem falhou apos 429')
        verificar(Date.now() - inicio >= 900, 'nao esperou o Retry-After')
        return `${((Date.now() - inicio) / 1000).toFixed(1)}s de espera`
      })
    }

    // ---------------------------------------------------------- 2. envio pequeno
    grupo('2. Envio pequeno (uma requisicao)')

    criarMidia('pequeno.bin', 256 * 1024)
    let jobPequeno: { id: string; driveFileId: string | null; sha256: string | null } | null = null

    await teste('envia pacote de poucos KB em multipart', async () => {
      const resultado = await executarBackup({ escopo: 'MIDIAS', destino: 'AMBOS', forcar: true })
      const nuvem = resultado.jobs.find((j) => j.tipo === 'NUVEM')

      igual(nuvem?.status, 'SUCESSO', 'status do job de nuvem')
      verificar(nuvem?.driveFileId, 'driveFileId ausente')
      jobPequeno = { id: nuvem!.id, driveFileId: nuvem!.driveFileId, sha256: nuvem!.sha256 }

      if (!MODO_REAL) {
        igual(mock.estatisticas.uploadsMultipart, 1, 'deveria ter usado multipart')
        igual(mock.estatisticas.sessoesCriadas, 0, 'nao deveria abrir sessao resumable')
      }
      return `${Number(nuvem!.tamanhoBytes)} bytes`
    })

    await teste('bytes no Drive batem com o arquivo local', async () => {
      if (MODO_REAL) {
        const backups = await drive.listarBackups(pastaId)
        const achado = backups.find((b) => b.id === jobPequeno!.driveFileId)
        verificar(achado, 'arquivo nao encontrado no Drive')
        return `${achado!.tamanho} bytes no Drive`
      }

      const arquivo = mock.arquivos.get(jobPequeno!.driveFileId!)
      verificar(arquivo, 'arquivo nao chegou ao mock')
      const shaRecebido = crypto.createHash('sha256').update(arquivo!.conteudo).digest('hex')
      igual(shaRecebido, jobPequeno!.sha256, 'sha256 do que chegou ao Drive')
      return `${arquivo!.conteudo.length} bytes identicos`
    })

    await teste('appProperties levam a impressao digital do conteudo', async () => {
      const backups = await drive.listarBackups(pastaId)
      const achado = backups.find((b) => b.id === jobPequeno!.driveFileId)
      verificar(achado?.contentHash, 'contentHash nao foi gravado no arquivo do Drive')
      return `${achado!.contentHash!.slice(0, 16)}...`
    })

    // ---------------------------------------------------------- 3. envio grande
    grupo('3. Envio grande (em pedacos)')

    const TAMANHO_GRANDE = MODO_REAL ? 12 * 1024 * 1024 : 20 * 1024 * 1024
    await fs.promises.rm(path.join(DIR_MIDIAS, 'pequeno.bin'), { force: true })
    criarMidia('grande.bin', TAMANHO_GRANDE)

    let jobGrande: { id: string; driveFileId: string | null; sha256: string | null; arquivo: string | null } | null = null

    await teste(`envia ${(TAMANHO_GRANDE / 1024 ** 2).toFixed(0)} MB em sessao retomavel`, async () => {
      const resultado = await executarBackup({ escopo: 'MIDIAS', destino: 'AMBOS', forcar: true })
      const nuvem = resultado.jobs.find((j) => j.tipo === 'NUVEM')

      igual(nuvem?.status, 'SUCESSO', 'status do job de nuvem')
      jobGrande = {
        id: nuvem!.id,
        driveFileId: nuvem!.driveFileId,
        sha256: nuvem!.sha256,
        arquivo: nuvem!.arquivo,
      }

      if (!MODO_REAL) {
        verificar(mock.estatisticas.sessoesCriadas >= 1, 'deveria ter aberto sessao resumable')
        verificar(mock.estatisticas.chunksRecebidos >= 2, 'deveria ter enviado em varios pedacos')
      }
      return `${(Number(nuvem!.tamanhoBytes) / 1024 ** 2).toFixed(1)} MB`
    })

    await teste('conteudo grande chega integro', async () => {
      if (MODO_REAL) {
        const backups = await drive.listarBackups(pastaId)
        const achado = backups.find((b) => b.id === jobGrande!.driveFileId)
        verificar(achado, 'arquivo grande nao esta no Drive')
        return `${(achado!.tamanho / 1024 ** 2).toFixed(1)} MB no Drive`
      }

      const arquivo = mock.arquivos.get(jobGrande!.driveFileId!)
      verificar(arquivo, 'arquivo grande nao chegou ao mock')
      const sha = crypto.createHash('sha256').update(arquivo!.conteudo).digest('hex')
      igual(sha, jobGrande!.sha256, 'sha256 do arquivo grande')
      return `${(arquivo!.conteudo.length / 1024 ** 2).toFixed(1)} MB identicos`
    })

    if (!MODO_REAL) {
      await teste('queda de conexao no meio do envio: retoma do offset certo', async () => {
        mock.zerarEstatisticas()
        mock.falhas.cortarNoChunk = 1

        let resultado
        try {
          resultado = await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
        } finally {
          mock.falhas.cortarNoChunk = undefined
        }

        const nuvem = resultado.jobs[0]
        igual(nuvem.status, 'SUCESSO', 'status apos retomada')

        const arquivo = mock.arquivos.get(nuvem.driveFileId!)
        verificar(arquivo, 'arquivo nao foi materializado apos a retomada')
        const sha = crypto.createHash('sha256').update(arquivo!.conteudo).digest('hex')
        igual(sha, nuvem.sha256, 'sha256 apos retomada')
        return `${mock.estatisticas.chunksRecebidos} pedacos aceitos`
      })

      await teste('503 com Retry-After: repete sem duplicar arquivo', async () => {
        mock.zerarEstatisticas()
        const arquivosAntes = mock.arquivos.size
        mock.falhas.erro503NoChunk = 1

        let resultado
        try {
          resultado = await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
        } finally {
          mock.falhas.erro503NoChunk = undefined
        }

        igual(resultado.jobs[0].status, 'SUCESSO', 'status apos 503')
        igual(mock.arquivos.size, arquivosAntes + 1, 'deveria ter criado exatamente 1 arquivo')

        const arquivo = mock.arquivos.get(resultado.jobs[0].driveFileId!)
        const sha = crypto.createHash('sha256').update(arquivo!.conteudo).digest('hex')
        igual(sha, resultado.jobs[0].sha256, 'sha256 apos 503')
        return '1 arquivo, conteudo integro'
      })
    }

    // ---------------------------------------------------------- 4. duplicidade
    grupo('4. Duplicidade na nuvem')

    await teste('conteudo ja presente no Drive nao e reenviado', async () => {
      const primeiro = await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
      igual(primeiro.jobs[0].status, 'SUCESSO', 'primeiro envio')

      const antes = MODO_REAL ? 0 : mock.arquivos.size
      const segundo = await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM' })

      igual(segundo.jobs[0].status, 'DUPLICADO', 'segundo envio deveria ser dispensado')
      if (!MODO_REAL) igual(mock.arquivos.size, antes, 'nenhum arquivo novo deveria aparecer')
      return 'envio dispensado'
    })

    await teste('enviar manualmente um pacote ja existente tambem e dispensado', async () => {
      const local = await executarBackup({ escopo: 'MIDIAS', destino: 'LOCAL' })
      const job = local.jobs[0]

      const enviado = await enviarJobParaDrive(job.id)
      igual(enviado.status, 'DUPLICADO', 'status do envio manual')
      return 'reaproveitou o arquivo do Drive'
    })

    // ---------------------------------------------------------- 5. download
    grupo('5. Download de volta')

    await teste('traz o pacote do Drive e confere o sha256', async () => {
      const job = await prisma.backupJob.findFirst({
        where: { tipo: 'NUVEM', status: 'SUCESSO', driveFileId: { not: null }, sha256: { not: null } },
        orderBy: { iniciadoEm: 'desc' },
      })
      verificar(job, 'nenhum job de nuvem para baixar')

      // Remove a copia local para forcar o download.
      if (job!.caminhoLocal) await fs.promises.rm(job!.caminhoLocal, { force: true })
      await prisma.backupJob.update({ where: { id: job!.id }, data: { caminhoLocal: null } })

      const atualizado = await puxarDoDrive(job!.id)
      verificar(atualizado.caminhoLocal, 'caminho local nao foi preenchido')

      const sha = await sha256De(atualizado.caminhoLocal!)
      igual(sha, job!.sha256, 'sha256 do arquivo baixado')
      return `${(Number(atualizado.tamanhoBytes) / 1024 ** 2).toFixed(1)} MB baixados`
    })

    if (!MODO_REAL) {
      await teste('download corrompido e recusado e nao deixa arquivo no disco', async () => {
        const job = await prisma.backupJob.findFirst({
          where: { tipo: 'NUVEM', status: 'SUCESSO', driveFileId: { not: null } },
          orderBy: { iniciadoEm: 'desc' },
        })

        const arquivo = mock.arquivos.get(job!.driveFileId!)
        const original = arquivo!.conteudo
        arquivo!.conteudo = Buffer.concat([original, Buffer.from('lixo')])

        if (job!.caminhoLocal) await fs.promises.rm(job!.caminhoLocal, { force: true })
        await prisma.backupJob.update({ where: { id: job!.id }, data: { caminhoLocal: null } })

        let mensagem = ''
        try {
          await puxarDoDrive(job!.id)
        } catch (erro) {
          mensagem = (erro as Error).message
        } finally {
          arquivo!.conteudo = original
        }

        verificar(mensagem.includes('nao confere'), `mensagem inesperada: ${mensagem}`)

        const nome = job!.arquivo ?? ''
        verificar(!fs.existsSync(path.join(DIR_BACKUPS, nome)), 'o arquivo corrompido nao deveria ficar no disco')
        return 'recusado e removido'
      })
    }

    // ---------------------------------------------------------- 6. retencao
    grupo('6. Retencao na nuvem')

    await teste('mantem apenas os N mais recentes na pasta', async () => {
      const alvo = MODO_REAL ? 2 : 2

      // Garante ao menos 4 pacotes distintos na pasta.
      const existentes = await drive.listarBackups(pastaId)
      for (let i = existentes.length; i < 4; i++) {
        criarMidia('variavel.bin', 64 * 1024 + i * 4096)
        await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
      }

      const antes = await drive.listarBackups(pastaId)
      verificar(antes.length >= 4, `esperava ao menos 4 backups na pasta, achei ${antes.length}`)

      await prisma.backupConfig.update({ where: { id: 'singleton' }, data: { nuvemRetencaoQtd: alvo } })
      const relatorio = await aplicarRetencaoNuvem()

      const depois = await drive.listarBackups(pastaId)
      igual(depois.length, alvo, 'quantidade apos a retencao')
      verificar(relatorio.removidos.length === antes.length - alvo, 'contagem de removidos inconsistente')

      // O mais recente tem que continuar la.
      igual(depois[0].id, antes[0].id, 'o backup mais recente foi apagado')
      return `${antes.length} -> ${depois.length}`
    })

    await teste('retencao desligada (0) nao apaga nada', async () => {
      await prisma.backupConfig.update({ where: { id: 'singleton' }, data: { nuvemRetencaoQtd: 0 } })
      const antes = (await drive.listarBackups(pastaId)).length
      await aplicarRetencaoNuvem()
      igual((await drive.listarBackups(pastaId)).length, antes, 'nada deveria ser apagado')
      return `${antes} preservados`
    })

    // ---------------------------------------------------------- 7. erros
    grupo('7. Erros tratados')

    await teste('pasta inexistente vira erro claro', async () => {
      await prisma.backupConfig.update({
        where: { id: 'singleton' },
        data: { driveFolderId: 'pasta-que-nao-existe' },
      })

      let mensagem = ''
      try {
        await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
      } catch (erro) {
        mensagem = (erro as Error).message
      } finally {
        await prisma.backupConfig.update({ where: { id: 'singleton' }, data: { driveFolderId: pastaId } })
      }

      verificar(mensagem.length > 0, 'deveria ter falhado com pasta invalida')

      const job = await prisma.backupJob.findFirst({ where: { tipo: 'NUVEM' }, orderBy: { iniciadoEm: 'desc' } })
      igual(job?.status, 'ERRO', 'status do job')
      return mensagem.slice(0, 60)
    })

    await teste('sem pasta escolhida, o backup de nuvem avisa antes de tentar', async () => {
      await prisma.backupConfig.update({ where: { id: 'singleton' }, data: { driveFolderId: null } })

      let mensagem = ''
      try {
        await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
      } catch (erro) {
        mensagem = (erro as Error).message
      } finally {
        await prisma.backupConfig.update({ where: { id: 'singleton' }, data: { driveFolderId: pastaId } })
      }

      verificar(mensagem.includes('pasta'), `mensagem inesperada: ${mensagem}`)
      return mensagem.slice(0, 60)
    })

    if (!MODO_REAL) {
      await teste('broker recusando o token: mensagem clara e conexao desativada', async () => {
        mock.falhas.brokerInvalido = true

        let mensagem = ''
        try {
          await drive.getAccessToken(true)
        } catch (erro) {
          mensagem = (erro as Error).message
        } finally {
          mock.falhas.brokerInvalido = false
        }

        verificar(mensagem.includes('Conecte o Google Drive novamente'), `mensagem inesperada: ${mensagem}`)

        const conta = await prisma.backupDriveConta.findUnique({ where: { id: contaTesteId! } })
        verificar(conta?.revogadoEm, 'a conexao deveria ter sido marcada como revogada')

        // Reativa para os testes seguintes.
        await prisma.backupDriveConta.update({ where: { id: contaTesteId! }, data: { revogadoEm: null } })
        return 'conexao desativada'
      })

      await teste('sem conta conectada, backup de nuvem falha com aviso', async () => {
        await prisma.backupDriveConta.update({ where: { id: contaTesteId! }, data: { revogadoEm: new Date() } })

        let codigo = ''
        try {
          await executarBackup({ escopo: 'MIDIAS', destino: 'NUVEM', forcar: true })
        } catch (erro) {
          codigo = (erro as { codigo?: string }).codigo ?? (erro as Error).message
        } finally {
          await prisma.backupDriveConta.update({ where: { id: contaTesteId! }, data: { revogadoEm: null } })
        }

        igual(codigo, 'drive_nao_conectado', 'codigo do erro')
        return codigo
      })
    }

    // ---------------------------------------------------------- limpeza
    if (MODO_REAL) {
      const restantes = await drive.listarBackups(pastaId)
      console.log(`\nA pasta de teste ficou com ${restantes.length} arquivo(s) no seu Drive.`)
      console.log('Pode apagar "Portal Transparencia - teste" quando quiser.')
    }
  } finally {
    codigoSaida = resumo()

    await prisma.backupJob.deleteMany({ where: { iniciadoEm: { gte: marcoInicial } } })
    if (contaTesteId) await prisma.backupDriveConta.delete({ where: { id: contaTesteId } }).catch(() => undefined)

    await prisma.backupConfig
      .update({
        where: { id: 'singleton' },
        data: {
          incluirBanco: true,
          incluirMidias: true,
          nuvemRetencaoQtd: 14,
          driveFolderId: MODO_REAL ? null : null,
          driveFolderNome: null,
        },
      })
      .catch(() => undefined)

    await prisma.$disconnect()
    if (!MODO_REAL) await mock.parar()
    await fs.promises.rm(RAIZ, { recursive: true, force: true }).catch(() => undefined)
  }

  process.exit(codigoSaida)
}

main().catch(async (erro) => {
  console.error('\nFalha geral na suite de nuvem:', erro)
  console.log(`Testes concluidos antes da falha: ${resultados.length}`)
  await fs.promises.rm(RAIZ, { recursive: true, force: true }).catch(() => undefined)
  process.exit(1)
})
