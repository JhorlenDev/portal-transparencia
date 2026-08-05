import fs from 'node:fs'
import path from 'node:path'

export const PREFIXO_ARQUIVO = 'portal-backup'

/**
 * Raiz do projeto em tempo de execucao.
 *
 * O comentario turbopackIgnore evita que o rastreador de arquivos do build conclua
 * que o projeto inteiro e dependencia destas rotas so por causa do process.cwd().
 */
function raizDoProjeto(): string {
  return /*turbopackIgnore: true*/ process.cwd()
}

/** Diretorio onde os pacotes .tar.gz sao guardados. Nunca pode ficar dentro de public/. */
export function getBackupDir(): string {
  const configurado = process.env.BACKUP_DIR?.trim()
  const dir = path.resolve(configurado && configurado.length > 0 ? configurado : path.join(raizDoProjeto(), 'backups'))

  const publicDir = path.resolve(raizDoProjeto(), 'public')
  if (dir === publicDir || dir.startsWith(publicDir + path.sep)) {
    throw new Error(
      `BACKUP_DIR nao pode ficar dentro de public/ (os pacotes ficariam acessiveis publicamente): ${dir}`
    )
  }

  return dir
}

export function getTmpDir(): string {
  return path.join(getBackupDir(), 'tmp')
}

export function getLockFile(): string {
  return path.join(getBackupDir(), '.lock')
}

export async function ensureBackupDirs(): Promise<{ backupDir: string; tmpDir: string }> {
  const backupDir = getBackupDir()
  const tmpDir = getTmpDir()
  await fs.promises.mkdir(tmpDir, { recursive: true })
  return { backupDir, tmpDir }
}

export interface RaizMidia {
  /** Caminho absoluto no disco. */
  absPath: string
  /** Caminho dentro do pacote, ex.: "media/uploads". */
  entryPath: string
}

/**
 * Pastas de midia incluidas no backup. Default: public/uploads.
 * BACKUP_MEDIA_DIRS aceita uma lista separada por virgula, relativa ao cwd ou absoluta.
 */
export function getRaizesMidia(): RaizMidia[] {
  const bruto = process.env.BACKUP_MEDIA_DIRS?.trim()
  const entradas = bruto && bruto.length > 0
    ? bruto.split(',').map((p) => p.trim()).filter(Boolean)
    : ['public/uploads']

  const vistos = new Set<string>()
  const raizes: RaizMidia[] = []

  for (const entrada of entradas) {
    const absPath = path.resolve(raizDoProjeto(), entrada)
    if (vistos.has(absPath)) continue
    vistos.add(absPath)

    // "public/uploads" -> "media/uploads"; caminhos fora de public/ usam o nome da pasta.
    const relAoPublic = path.relative(path.resolve(raizDoProjeto(), 'public'), absPath)
    const nome = !relAoPublic.startsWith('..') && !path.isAbsolute(relAoPublic)
      ? relAoPublic.split(path.sep).join('/')
      : path.basename(absPath)

    raizes.push({ absPath, entryPath: `media/${nome}` })
  }

  return raizes
}

/** Garante que o caminho informado esta dentro do diretorio de backups (evita path traversal). */
export function assertDentroDoBackupDir(alvo: string): string {
  const backupDir = getBackupDir()
  const resolvido = path.resolve(alvo)
  if (resolvido !== backupDir && !resolvido.startsWith(backupDir + path.sep)) {
    throw new Error(`Caminho fora do diretorio de backups: ${resolvido}`)
  }
  return resolvido
}

export function nomeArquivoBackup(escopo: string, data: Date): string {
  const p = (n: number, casas = 2) => String(n).padStart(casas, '0')
  const carimbo =
    `${data.getFullYear()}${p(data.getMonth() + 1)}${p(data.getDate())}` +
    `-${p(data.getHours())}${p(data.getMinutes())}${p(data.getSeconds())}`
  return `${PREFIXO_ARQUIVO}-${escopo.toLowerCase()}-${carimbo}.tar.gz`
}

/**
 * Nome livre no diretorio de backups. O carimbo tem precisao de segundos, entao
 * duas execucoes no mesmo segundo receberiam o mesmo nome e uma sobrescreveria a outra.
 */
export async function nomeArquivoDisponivel(escopo: string, data: Date): Promise<string> {
  const base = nomeArquivoBackup(escopo, data)
  const dir = getBackupDir()

  let candidato = base
  let sufixo = 2

  while (true) {
    try {
      await fs.promises.access(path.join(dir, candidato))
    } catch {
      return candidato
    }
    candidato = base.replace(/\.tar\.gz$/, `-${sufixo}.tar.gz`)
    sufixo += 1
    if (sufixo > 1000) throw new Error('Nao foi possivel gerar um nome livre para o pacote de backup.')
  }
}

/** Espaco livre em bytes no filesystem do diretorio de backups. */
export async function espacoLivreBytes(dir = getBackupDir()): Promise<number> {
  const stat = await fs.promises.statfs(dir)
  return Number(stat.bavail) * Number(stat.bsize)
}
