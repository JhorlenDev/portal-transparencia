/**
 * Cliente do Google Drive no modo "broker": o BackupHub so autentica (guarda o
 * refresh_token e emite access_token). Os bytes vao do nosso servidor direto para
 * googleapis.com — nunca passam pelo BackupHub.
 *
 * Doc do broker: https://backup.marreira.link/api/skill/broker
 */

import fs from 'node:fs'
import type { BackupDriveConta } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { cifrarSegredo, decifrarSegredo } from './crypto'

export const BROKER_BASE = (process.env.BACKUPHUB_BASE_URL?.trim() || 'https://backup.marreira.link').replace(/\/$/, '')
const API_BASE = (process.env.GOOGLE_DRIVE_API_BASE?.trim() || 'https://www.googleapis.com/drive/v3').replace(/\/$/, '')
const UPLOAD_BASE = (process.env.GOOGLE_DRIVE_UPLOAD_BASE?.trim() || 'https://www.googleapis.com/upload/drive/v3').replace(/\/$/, '')

export const TAMANHO_CHUNK = 8 * 1024 * 1024 // multiplo de 256 KB, exigido pelo Google
export const LIMITE_MULTIPART = 5 * 1024 * 1024
export const APP_MARCADOR = 'portal-transparencia'

const MIME_PASTA = 'application/vnd.google-apps.folder'

export class DriveError extends Error {
  readonly codigo: string
  readonly status: number

  constructor(codigo: string, mensagem: string, status = 500) {
    super(mensagem)
    this.name = 'DriveError'
    this.codigo = codigo
    this.status = status
  }
}

export class DriveNaoConectadoError extends DriveError {
  constructor() {
    super('drive_nao_conectado', 'Nenhuma conta do Google Drive conectada.', 409)
  }
}

// ---------------------------------------------------------------- conta / token

export async function getContaAtiva(): Promise<BackupDriveConta | null> {
  return prisma.backupDriveConta.findFirst({
    where: { revogadoEm: null },
    orderBy: { conectadoEm: 'desc' },
  })
}

export interface ResultadoClaim {
  brokerToken: string
  email: string
  googleSub?: string
  scope?: string
  quotaTotalBytes?: string
  quotaUsedBytes?: string
}

/** Troca o link_code de uso unico por um brokerToken (server-to-server). */
export async function trocarLinkCode(linkCode: string): Promise<ResultadoClaim> {
  const resposta = await fetch(`${BROKER_BASE}/api/broker/gdrive/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ link_code: linkCode }),
  })

  const corpo = (await resposta.json().catch(() => ({}))) as Record<string, string>
  if (!resposta.ok) {
    throw new DriveError(corpo.error || 'claim_falhou', mensagemBroker(corpo.error, resposta.status), resposta.status)
  }
  if (!corpo.brokerToken) {
    throw new DriveError('claim_sem_token', 'O BackupHub nao devolveu o token de conexao.', 502)
  }

  return corpo as unknown as ResultadoClaim
}

export async function salvarConexao(dados: ResultadoClaim): Promise<BackupDriveConta> {
  // So uma conexao ativa por vez: as anteriores ficam marcadas como revogadas.
  await prisma.backupDriveConta.updateMany({
    where: { revogadoEm: null },
    data: { revogadoEm: new Date() },
  })

  cacheToken.token = null

  return prisma.backupDriveConta.create({
    data: {
      email: dados.email || 'desconhecido',
      googleSub: dados.googleSub ?? null,
      escopo: dados.scope ?? null,
      tokenCifrado: cifrarSegredo(dados.brokerToken),
      quotaTotal: dados.quotaTotalBytes ?? null,
      quotaUsada: dados.quotaUsedBytes ?? null,
    },
  })
}

export async function revogarConexao(): Promise<void> {
  const conta = await getContaAtiva()
  if (!conta) return

  const brokerToken = decifrarSegredo(conta.tokenCifrado)
  cacheToken.token = null

  try {
    await fetch(`${BROKER_BASE}/api/broker/gdrive/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${brokerToken}` },
    })
  } catch {
    // Mesmo que o broker esteja fora do ar, a conexao local e desativada.
  }

  await prisma.backupDriveConta.update({
    where: { id: conta.id },
    data: { revogadoEm: new Date() },
  })
}

const chaveCache = Symbol.for('portal-transparencia.drive-token')
interface CacheToken {
  token: { valor: string; expiraEm: number; contaId: string } | null
}
const globalCache = globalThis as typeof globalThis & { [chaveCache]?: CacheToken }
if (!globalCache[chaveCache]) globalCache[chaveCache] = { token: null }
const cacheToken = globalCache[chaveCache]

/** access_token com cache em memoria e 10 min de folga antes do vencimento. */
export async function getAccessToken(forcarRenovacao = false): Promise<string> {
  const conta = await getContaAtiva()
  if (!conta) throw new DriveNaoConectadoError()

  const cache = cacheToken.token
  if (!forcarRenovacao && cache && cache.contaId === conta.id && cache.expiraEm > Date.now()) {
    return cache.valor
  }

  const brokerToken = decifrarSegredo(conta.tokenCifrado)
  const resposta = await fetch(`${BROKER_BASE}/api/broker/gdrive/token`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${brokerToken}` },
  })

  const corpo = (await resposta.json().catch(() => ({}))) as Record<string, string | number>

  if (!resposta.ok) {
    const codigo = String(corpo.error ?? 'token_falhou')
    const mensagem = mensagemBroker(codigo, resposta.status)

    await prisma.backupDriveConta.update({
      where: { id: conta.id },
      data: {
        ultimoErro: mensagem,
        revogadoEm: codigo === 'connection_revoked' || codigo === 'invalid_broker_token' ? new Date() : null,
      },
    })

    throw new DriveError(codigo, mensagem, resposta.status)
  }

  const valor = String(corpo.access_token ?? '')
  if (!valor) throw new DriveError('token_vazio', 'O BackupHub nao devolveu um access_token.', 502)

  const expiraEmSeg = Number(corpo.expires_in ?? 3600)
  cacheToken.token = {
    valor,
    contaId: conta.id,
    expiraEm: Date.now() + Math.max(60, expiraEmSeg - 600) * 1000,
  }

  await prisma.backupDriveConta.update({
    where: { id: conta.id },
    data: { ultimoUsoEm: new Date(), ultimoErro: null },
  })

  return valor
}

function mensagemBroker(codigo: string | undefined, status: number): string {
  switch (codigo) {
    case 'missing_broker_token':
    case 'invalid_broker_token':
      return 'Token de conexao invalido. Conecte o Google Drive novamente.'
    case 'connection_expired':
      return 'A conexao com o Google Drive expirou. Reconecte a conta.'
    case 'connection_revoked':
      return 'A conexao com o Google Drive foi revogada. Reconecte a conta.'
    case 'invalid_link_code':
      return 'O codigo de conexao expirou ou ja foi usado. Refaca a conexao.'
    case 'invalid_return_url':
      return 'A URL de retorno nao foi aceita pelo BackupHub. Confira NEXT_PUBLIC_APP_URL.'
    case 'rate_limited':
      return 'Muitas requisicoes ao BackupHub. Tente de novo em alguns instantes.'
    default:
      return `Falha na comunicacao com o BackupHub (HTTP ${status}).`
  }
}

// ---------------------------------------------------------------- HTTP helpers

const RETENTAVEIS = new Set([408, 429, 500, 502, 503, 504])

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface OpcoesFetch extends RequestInit {
  tentativas?: number
  /** Renova o access_token e refaz a chamada em caso de 401. */
  renovarEm401?: boolean
}

async function driveFetch(url: string, opcoes: OpcoesFetch = {}): Promise<Response> {
  const { tentativas = 5, renovarEm401 = true, headers, ...resto } = opcoes

  let ultimaResposta: Response | null = null
  let ultimoErro: unknown = null

  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    const token = await getAccessToken(tentativa > 0 && ultimaResposta?.status === 401 && renovarEm401)

    try {
      const resposta = await fetch(url, {
        ...resto,
        headers: { ...(headers ?? {}), Authorization: `Bearer ${token}` },
      })

      if (resposta.ok || resposta.status === 308) return resposta

      if (resposta.status === 401 && renovarEm401 && tentativa < tentativas - 1) {
        ultimaResposta = resposta
        continue
      }

      if (!RETENTAVEIS.has(resposta.status) || tentativa === tentativas - 1) return resposta

      ultimaResposta = resposta
      const retryAfter = Number(resposta.headers.get('retry-after'))
      const espera = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : Math.min(30_000, 2 ** tentativa * 1000)
      await esperar(espera)
    } catch (erro) {
      ultimoErro = erro
      if (tentativa === tentativas - 1) break
      await esperar(Math.min(30_000, 2 ** tentativa * 1000))
    }
  }

  if (ultimaResposta) return ultimaResposta
  throw new DriveError('rede', `Falha de rede ao falar com o Google Drive: ${(ultimoErro as Error)?.message}`, 502)
}

async function erroDaResposta(resposta: Response, contexto: string): Promise<DriveError> {
  const texto = await resposta.text().catch(() => '')
  let detalhe = texto.slice(0, 500)
  try {
    const json = JSON.parse(texto) as { error?: { message?: string } }
    if (json.error?.message) detalhe = json.error.message
  } catch {
    // resposta nao-JSON: usa o texto cru mesmo
  }

  const codigo = resposta.status === 404 ? 'nao_encontrado' : resposta.status === 403 ? 'sem_permissao' : 'erro_drive'
  return new DriveError(codigo, `${contexto}: ${detalhe || `HTTP ${resposta.status}`}`, resposta.status)
}

// ---------------------------------------------------------------- pastas

export interface PastaDrive {
  id: string
  nome: string
}

export async function listarPastas(parentId = 'root'): Promise<PastaDrive[]> {
  const q = `'${parentId.replace(/'/g, "\\'")}' in parents and mimeType = '${MIME_PASTA}' and trashed = false`
  const url = new URL(`${API_BASE}/files`)
  url.searchParams.set('q', q)
  url.searchParams.set('fields', 'files(id,name)')
  url.searchParams.set('orderBy', 'name')
  url.searchParams.set('pageSize', '200')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('includeItemsFromAllDrives', 'true')

  const resposta = await driveFetch(url.toString())
  if (!resposta.ok) throw await erroDaResposta(resposta, 'Nao foi possivel listar as pastas do Drive')

  const corpo = (await resposta.json()) as { files?: Array<{ id: string; name: string }> }
  return (corpo.files ?? []).map((f) => ({ id: f.id, nome: f.name }))
}

export async function infoArquivo(fileId: string): Promise<{ id: string; nome: string; parents: string[]; tamanho?: number } | null> {
  const url = new URL(`${API_BASE}/files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('fields', 'id,name,parents,size,trashed')
  url.searchParams.set('supportsAllDrives', 'true')

  const resposta = await driveFetch(url.toString())
  if (resposta.status === 404) return null
  if (!resposta.ok) throw await erroDaResposta(resposta, 'Nao foi possivel ler os dados do item no Drive')

  const corpo = (await resposta.json()) as { id: string; name: string; parents?: string[]; size?: string; trashed?: boolean }
  if (corpo.trashed) return null
  return {
    id: corpo.id,
    nome: corpo.name,
    parents: corpo.parents ?? [],
    tamanho: corpo.size ? Number(corpo.size) : undefined,
  }
}

export async function criarPasta(nome: string, parentId = 'root'): Promise<PastaDrive> {
  const url = new URL(`${API_BASE}/files`)
  url.searchParams.set('fields', 'id,name')
  url.searchParams.set('supportsAllDrives', 'true')

  const resposta = await driveFetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: nome, mimeType: MIME_PASTA, parents: [parentId] }),
  })

  if (!resposta.ok) throw await erroDaResposta(resposta, 'Nao foi possivel criar a pasta no Drive')

  const corpo = (await resposta.json()) as { id: string; name: string }
  return { id: corpo.id, nome: corpo.name }
}

/** Garante uma pasta com o nome informado dentro do parent, reaproveitando se ja existir. */
export async function garantirPasta(nome: string, parentId = 'root'): Promise<PastaDrive> {
  const existentes = await listarPastas(parentId)
  const achada = existentes.find((p) => p.nome === nome)
  return achada ?? criarPasta(nome, parentId)
}

export interface ArquivoDrive {
  id: string
  nome: string
  tamanho: number
  criadoEm: string
  contentHash?: string
  sha256?: string
}

export async function listarBackups(folderId: string): Promise<ArquivoDrive[]> {
  const q = `'${folderId.replace(/'/g, "\\'")}' in parents and trashed = false and appProperties has { key='app' and value='${APP_MARCADOR}' }`
  const url = new URL(`${API_BASE}/files`)
  url.searchParams.set('q', q)
  url.searchParams.set('fields', 'files(id,name,size,createdTime,appProperties)')
  url.searchParams.set('orderBy', 'createdTime desc')
  url.searchParams.set('pageSize', '500')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('includeItemsFromAllDrives', 'true')

  const resposta = await driveFetch(url.toString())
  if (!resposta.ok) throw await erroDaResposta(resposta, 'Nao foi possivel listar os backups no Drive')

  const corpo = (await resposta.json()) as {
    files?: Array<{ id: string; name: string; size?: string; createdTime: string; appProperties?: Record<string, string> }>
  }

  return (corpo.files ?? []).map((f) => ({
    id: f.id,
    nome: f.name,
    tamanho: Number(f.size ?? 0),
    criadoEm: f.createdTime,
    contentHash: f.appProperties?.contentHash,
    sha256: f.appProperties?.sha256,
  }))
}

export async function buscarPorContentHash(folderId: string, contentHash: string): Promise<ArquivoDrive | null> {
  const backups = await listarBackups(folderId)
  return backups.find((b) => b.contentHash === contentHash) ?? null
}

export async function excluirArquivo(fileId: string): Promise<void> {
  const url = new URL(`${API_BASE}/files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('supportsAllDrives', 'true')

  const resposta = await driveFetch(url.toString(), { method: 'DELETE' })
  if (!resposta.ok && resposta.status !== 404) {
    throw await erroDaResposta(resposta, 'Nao foi possivel excluir o arquivo no Drive')
  }
}

export async function quotaDaConta(): Promise<{ total?: number; usado?: number; email?: string }> {
  const url = new URL(`${API_BASE}/about`)
  url.searchParams.set('fields', 'storageQuota,user')

  const resposta = await driveFetch(url.toString())
  if (!resposta.ok) throw await erroDaResposta(resposta, 'Nao foi possivel ler a cota do Drive')

  const corpo = (await resposta.json()) as {
    storageQuota?: { limit?: string; usage?: string }
    user?: { emailAddress?: string }
  }

  return {
    total: corpo.storageQuota?.limit ? Number(corpo.storageQuota.limit) : undefined,
    usado: corpo.storageQuota?.usage ? Number(corpo.storageQuota.usage) : undefined,
    email: corpo.user?.emailAddress,
  }
}

// ---------------------------------------------------------------- upload

export interface OpcoesUpload {
  caminho: string
  nome: string
  folderId: string
  appProperties?: Record<string, string>
  mimeType?: string
  onProgresso?: (enviados: number, total: number) => void
}

export interface ResultadoUpload {
  id: string
  nome: string
  tamanho: number
  reaproveitado?: boolean
}

export async function enviarArquivo(opcoes: OpcoesUpload): Promise<ResultadoUpload> {
  const info = await fs.promises.stat(opcoes.caminho)
  const metadata = {
    name: opcoes.nome,
    parents: [opcoes.folderId],
    appProperties: { app: APP_MARCADOR, ...(opcoes.appProperties ?? {}) },
  }
  const mimeType = opcoes.mimeType ?? 'application/gzip'

  if (info.size <= LIMITE_MULTIPART) {
    return enviarMultipart(opcoes.caminho, metadata, mimeType, info.size, opcoes.onProgresso)
  }
  return enviarResumable(opcoes.caminho, metadata, mimeType, info.size, opcoes.onProgresso)
}

async function enviarMultipart(
  caminho: string,
  metadata: Record<string, unknown>,
  mimeType: string,
  tamanho: number,
  onProgresso?: (enviados: number, total: number) => void
): Promise<ResultadoUpload> {
  const boundary = `pt-${Math.random().toString(36).slice(2)}-${process.pid}`
  const conteudo = await fs.promises.readFile(caminho)

  const corpo = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`
    ),
    conteudo,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])

  const url = new URL(`${UPLOAD_BASE}/files`)
  url.searchParams.set('uploadType', 'multipart')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('fields', 'id,name,size')

  const resposta = await driveFetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body: corpo,
  })

  if (!resposta.ok) throw await erroDaResposta(resposta, 'Falha ao enviar o backup para o Drive')

  const json = (await resposta.json()) as { id: string; name: string; size?: string }
  onProgresso?.(tamanho, tamanho)
  return { id: json.id, nome: json.name, tamanho: json.size ? Number(json.size) : tamanho }
}

async function iniciarSessaoResumable(
  metadata: Record<string, unknown>,
  mimeType: string,
  tamanho: number
): Promise<string> {
  const url = new URL(`${UPLOAD_BASE}/files`)
  url.searchParams.set('uploadType', 'resumable')
  url.searchParams.set('supportsAllDrives', 'true')
  url.searchParams.set('fields', 'id,name,size')

  const resposta = await driveFetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType,
      'X-Upload-Content-Length': String(tamanho),
    },
    body: JSON.stringify(metadata),
  })

  if (!resposta.ok) throw await erroDaResposta(resposta, 'Falha ao iniciar o envio para o Drive')

  const location = resposta.headers.get('location')
  if (!location) throw new DriveError('sem_location', 'O Google nao devolveu a URL de envio (Location).', 502)
  return location
}

/** Consulta quantos bytes o Google ja recebeu nessa sessao. */
async function offsetDaSessao(uploadUrl: string, tamanho: number): Promise<number | 'concluido'> {
  const resposta = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${await getAccessToken()}`,
      'Content-Range': `bytes */${tamanho}`,
      'Content-Length': '0',
    },
  })

  if (resposta.status === 200 || resposta.status === 201) return 'concluido'
  if (resposta.status !== 308) {
    throw await erroDaResposta(resposta, 'Falha ao retomar o envio para o Drive')
  }

  const range = resposta.headers.get('range')
  if (!range) return 0

  const m = /bytes=0-(\d+)/.exec(range)
  return m ? Number(m[1]) + 1 : 0
}

async function enviarResumable(
  caminho: string,
  metadata: Record<string, unknown>,
  mimeType: string,
  tamanho: number,
  onProgresso?: (enviados: number, total: number) => void
): Promise<ResultadoUpload> {
  const uploadUrl = await iniciarSessaoResumable(metadata, mimeType, tamanho)
  const handle = await fs.promises.open(caminho, 'r')

  try {
    let enviados = 0
    let falhasSeguidas = 0

    while (enviados < tamanho) {
      const fim = Math.min(enviados + TAMANHO_CHUNK, tamanho)
      const tamanhoChunk = fim - enviados
      const buffer = Buffer.allocUnsafe(tamanhoChunk)
      await handle.read(buffer, 0, tamanhoChunk, enviados)

      let resposta: Response
      try {
        resposta = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
            'Content-Length': String(tamanhoChunk),
            'Content-Range': `bytes ${enviados}-${fim - 1}/${tamanho}`,
            'Content-Type': mimeType,
          },
          body: buffer,
        })
      } catch (erro) {
        falhasSeguidas += 1
        if (falhasSeguidas > 5) {
          throw new DriveError('rede', `Envio interrompido: ${(erro as Error).message}`, 502)
        }
        await esperar(Math.min(30_000, 2 ** falhasSeguidas * 1000))
        const offset = await offsetDaSessao(uploadUrl, tamanho)
        if (offset === 'concluido') break
        enviados = offset
        continue
      }

      if (resposta.status === 200 || resposta.status === 201) {
        const json = (await resposta.json().catch(() => ({}))) as { id?: string; name?: string; size?: string }
        onProgresso?.(tamanho, tamanho)
        if (!json.id) throw new DriveError('resposta_invalida', 'O Google confirmou o envio sem devolver o id do arquivo.', 502)
        return { id: json.id, nome: json.name ?? String(metadata.name), tamanho: json.size ? Number(json.size) : tamanho }
      }

      if (resposta.status === 308) {
        falhasSeguidas = 0
        const range = resposta.headers.get('range')
        const m = range ? /bytes=0-(\d+)/.exec(range) : null
        enviados = m ? Number(m[1]) + 1 : fim
        onProgresso?.(enviados, tamanho)
        continue
      }

      if (resposta.status === 401) {
        // Token venceu no meio de um envio longo: renova e retoma de onde parou.
        falhasSeguidas += 1
        if (falhasSeguidas > 5) throw await erroDaResposta(resposta, 'Falha de autenticacao ao enviar o backup')
        await getAccessToken(true)
        const offset = await offsetDaSessao(uploadUrl, tamanho)
        if (offset === 'concluido') break
        enviados = offset
        continue
      }

      if (RETENTAVEIS.has(resposta.status)) {
        falhasSeguidas += 1
        if (falhasSeguidas > 5) throw await erroDaResposta(resposta, 'Falha repetida ao enviar o backup')
        const retryAfter = Number(resposta.headers.get('retry-after'))
        await esperar(
          Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : Math.min(30_000, 2 ** falhasSeguidas * 1000)
        )
        const offset = await offsetDaSessao(uploadUrl, tamanho)
        if (offset === 'concluido') break
        enviados = offset
        onProgresso?.(enviados, tamanho)
        continue
      }

      throw await erroDaResposta(resposta, 'Falha ao enviar o backup para o Drive')
    }

    // Saiu do laco porque o Google ja tinha o arquivo completo: confirma pelo nome
    // dentro da pasta de destino (nao basta o nome: pode existir homonimo em outra pasta).
    const pasta = (metadata.parents as string[] | undefined)?.[0] ?? 'root'
    const url = new URL(`${API_BASE}/files`)
    url.searchParams.set(
      'q',
      `name = '${String(metadata.name).replace(/'/g, "\\'")}' and '${pasta.replace(/'/g, "\\'")}' in parents and trashed = false`
    )
    url.searchParams.set('fields', 'files(id,name,size)')
    url.searchParams.set('supportsAllDrives', 'true')

    const resposta = await driveFetch(url.toString())
    const corpo = (await resposta.json().catch(() => ({}))) as { files?: Array<{ id: string; name: string; size?: string }> }
    const achado = corpo.files?.[0]
    if (!achado) throw new DriveError('confirmacao_falhou', 'Envio concluido, mas nao foi possivel confirmar o arquivo no Drive.', 502)

    onProgresso?.(tamanho, tamanho)
    return { id: achado.id, nome: achado.name, tamanho: achado.size ? Number(achado.size) : tamanho }
  } finally {
    await handle.close().catch(() => undefined)
  }
}

// ---------------------------------------------------------------- download

export async function baixarArquivo(
  fileId: string,
  destino: string,
  onProgresso?: (baixados: number) => void
): Promise<{ tamanho: number }> {
  const url = new URL(`${API_BASE}/files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('alt', 'media')
  url.searchParams.set('supportsAllDrives', 'true')

  const resposta = await driveFetch(url.toString())
  if (!resposta.ok || !resposta.body) {
    throw await erroDaResposta(resposta, 'Falha ao baixar o backup do Drive')
  }

  const { pipeline } = await import('node:stream/promises')
  const { Readable, Transform } = await import('node:stream')

  let baixados = 0
  const medidor = new Transform({
    transform(chunk, _enc, cb) {
      baixados += chunk.length
      onProgresso?.(baixados)
      cb(null, chunk)
    },
  })

  const parcial = `${destino}.parcial`
  await pipeline(Readable.fromWeb(resposta.body as Parameters<typeof Readable.fromWeb>[0]), medidor, fs.createWriteStream(parcial))
  await fs.promises.rename(parcial, destino)

  return { tamanho: baixados }
}
