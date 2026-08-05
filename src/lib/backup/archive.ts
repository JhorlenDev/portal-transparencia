/**
 * Empacotamento .tar.gz em streaming.
 *
 * O pacote e montado a partir de um diretorio de staging em <BACKUP_DIR>/tmp/<job>/,
 * onde as midias entram como hardlink (fallback: copia) para nao duplicar bytes em disco
 * e para congelar o conteudo mesmo que o original seja alterado durante o empacotamento.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { Transform } from 'node:stream'
import * as tar from 'tar'
import { getTmpDir } from './paths'

export interface ResultadoPacote {
  caminho: string
  tamanhoBytes: number
  sha256: string
}

export async function criarStaging(id: string): Promise<string> {
  const dir = path.join(getTmpDir(), id)
  await fs.promises.rm(dir, { recursive: true, force: true })
  await fs.promises.mkdir(dir, { recursive: true })
  return dir
}

export async function limparStaging(dir: string): Promise<void> {
  await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => undefined)
}

/**
 * Coloca um arquivo no staging. Tenta hardlink (instantaneo, zero bytes extras);
 * se estiver em outro filesystem, copia.
 */
export async function adicionarAoStaging(
  stagingDir: string,
  origem: string,
  entryPath: string
): Promise<'link' | 'copia'> {
  const destino = path.join(stagingDir, entryPath)
  await fs.promises.mkdir(path.dirname(destino), { recursive: true })

  try {
    await fs.promises.link(origem, destino)
    return 'link'
  } catch (erro) {
    const codigo = (erro as NodeJS.ErrnoException).code
    if (codigo !== 'EXDEV' && codigo !== 'EPERM' && codigo !== 'EMLINK' && codigo !== 'ENOSYS') {
      throw erro
    }
    await fs.promises.copyFile(origem, destino)
    return 'copia'
  }
}

/** Empacota o staging inteiro em destino (.tar.gz), calculando sha256 durante o fluxo. */
export async function empacotar(
  stagingDir: string,
  destino: string,
  entradas: string[]
): Promise<ResultadoPacote> {
  const hash = crypto.createHash('sha256')
  let tamanhoBytes = 0

  const medidor = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk)
      tamanhoBytes += chunk.length
      cb(null, chunk)
    },
  })

  await fs.promises.mkdir(path.dirname(destino), { recursive: true })

  const leitura = tar.create(
    {
      gzip: { level: 6 },
      cwd: stagingDir,
      portable: true,
      follow: true,
      preservePaths: false,
    },
    entradas
  )

  await pipeline(leitura, medidor, fs.createWriteStream(destino))

  return { caminho: destino, tamanhoBytes, sha256: hash.digest('hex') }
}

/** Lista os membros de um pacote sem extrair (usado nos testes e na verificacao). */
export async function listarPacote(arquivo: string): Promise<string[]> {
  const membros: string[] = []
  await tar.list({
    file: arquivo,
    onReadEntry: (entrada) => {
      membros.push(entrada.path)
    },
  })
  return membros
}

export async function extrairPacote(arquivo: string, destino: string): Promise<void> {
  await fs.promises.mkdir(destino, { recursive: true })
  await tar.extract({ file: arquivo, cwd: destino })
}

/** Le um unico membro do pacote e devolve o conteudo em memoria (use so para arquivos pequenos). */
export async function lerMembro(arquivo: string, membro: string): Promise<Buffer | null> {
  const partes: Buffer[] = []
  let achou = false

  await tar.list({
    file: arquivo,
    onReadEntry: (entrada) => {
      if (entrada.path !== membro) {
        entrada.resume()
        return
      }
      achou = true
      entrada.on('data', (parte: Buffer) => partes.push(parte))
    },
  })

  return achou ? Buffer.concat(partes) : null
}

export async function sha256De(arquivo: string): Promise<string> {
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(arquivo, { highWaterMark: 1024 * 1024 })
  for await (const parte of stream) hash.update(parte as Buffer)
  return hash.digest('hex')
}
