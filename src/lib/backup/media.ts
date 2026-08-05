/**
 * Varredura das midias do projeto (public/uploads por padrao).
 * Calcula sha256 de cada arquivo em streaming e tolera arquivos que somem
 * ou ficam ilegiveis durante a varredura (o backup nao pode quebrar por causa disso).
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { getRaizesMidia, type RaizMidia } from './paths'

export interface ArquivoMidia {
  absPath: string
  /** Caminho dentro do pacote, ex.: "media/uploads/anexos/x/y.pdf". */
  entryPath: string
  tamanho: number
  sha256: string
}

export interface InventarioMidia {
  arquivos: ArquivoMidia[]
  totalBytes: number
  avisos: string[]
  raizes: string[]
}

export async function sha256Arquivo(absPath: string): Promise<string> {
  const hash = crypto.createHash('sha256')
  const stream = fs.createReadStream(absPath, { highWaterMark: 1024 * 1024 })
  for await (const parte of stream) hash.update(parte as Buffer)
  return hash.digest('hex')
}

async function varrerDiretorio(
  raiz: RaizMidia,
  dirAtual: string,
  inventario: InventarioMidia,
  visitados: Set<string>
): Promise<void> {
  // Evita visitar a mesma pasta duas vezes quando ha symlink apontando para dentro da arvore.
  try {
    const real = await fs.promises.realpath(dirAtual)
    if (visitados.has(real)) {
      inventario.avisos.push(`Pasta ja incluida por outro caminho, ignorada: ${dirAtual}`)
      return
    }
    visitados.add(real)
  } catch {
    // segue: se o realpath falhar, o readdir abaixo reporta o erro real
  }

  let entradas: fs.Dirent[]
  try {
    entradas = await fs.promises.readdir(dirAtual, { withFileTypes: true })
  } catch (erro) {
    inventario.avisos.push(`Nao foi possivel listar ${dirAtual}: ${(erro as Error).message}`)
    return
  }

  // Caminhos reais sao percorridos antes dos symlinks: assim, quando um link aponta
  // para dentro da propria arvore, o arquivo entra no pacote pelo caminho verdadeiro.
  entradas.sort((a, b) => {
    const linkA = a.isSymbolicLink() ? 1 : 0
    const linkB = b.isSymbolicLink() ? 1 : 0
    if (linkA !== linkB) return linkA - linkB
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })

  for (const entrada of entradas) {
    const absPath = path.join(dirAtual, entrada.name)
    const rel = path.relative(raiz.absPath, absPath).split(path.sep).join('/')
    const entryPath = `${raiz.entryPath}/${rel}`

    try {
      if (entrada.isSymbolicLink()) {
        const alvo = await fs.promises.stat(absPath)
        if (alvo.isDirectory()) {
          await varrerDiretorio(raiz, absPath, inventario, visitados)
          continue
        }
        if (!alvo.isFile()) continue
        inventario.arquivos.push({
          absPath,
          entryPath,
          tamanho: alvo.size,
          sha256: await sha256Arquivo(absPath),
        })
        inventario.totalBytes += alvo.size
        continue
      }

      if (entrada.isDirectory()) {
        await varrerDiretorio(raiz, absPath, inventario, visitados)
        continue
      }

      if (!entrada.isFile()) continue

      const info = await fs.promises.stat(absPath)
      inventario.arquivos.push({
        absPath,
        entryPath,
        tamanho: info.size,
        sha256: await sha256Arquivo(absPath),
      })
      inventario.totalBytes += info.size
    } catch (erro) {
      const codigo = (erro as NodeJS.ErrnoException).code
      if (codigo === 'ENOENT') {
        inventario.avisos.push(`Arquivo removido durante a varredura, ignorado: ${absPath}`)
      } else if (codigo === 'EACCES' || codigo === 'EPERM') {
        inventario.avisos.push(`Sem permissao de leitura, ignorado: ${absPath}`)
      } else if (codigo === 'ELOOP') {
        inventario.avisos.push(`Symlink quebrado ou circular, ignorado: ${absPath}`)
      } else {
        inventario.avisos.push(`Falha ao ler ${absPath}: ${(erro as Error).message}`)
      }
    }
  }
}

export async function inventariarMidias(raizes = getRaizesMidia()): Promise<InventarioMidia> {
  const inventario: InventarioMidia = { arquivos: [], totalBytes: 0, avisos: [], raizes: [] }

  for (const raiz of raizes) {
    let info: fs.Stats
    try {
      info = await fs.promises.stat(raiz.absPath)
    } catch {
      inventario.avisos.push(`Pasta de midias inexistente, ignorada: ${raiz.absPath}`)
      continue
    }
    if (!info.isDirectory()) {
      inventario.avisos.push(`Caminho de midias nao e uma pasta, ignorado: ${raiz.absPath}`)
      continue
    }

    inventario.raizes.push(raiz.absPath)
    await varrerDiretorio(raiz, raiz.absPath, inventario, new Set())
  }

  inventario.arquivos.sort((a, b) => (a.entryPath < b.entryPath ? -1 : a.entryPath > b.entryPath ? 1 : 0))
  return inventario
}
