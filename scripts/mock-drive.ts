/**
 * Servidor que imita o Google Drive e o broker do BackupHub.
 *
 * Serve para exercitar o caminho de nuvem sem depender de conta real: envio em
 * pedacos, retomada apos queda, 429/503 com Retry-After, deduplicacao, retencao,
 * download e expiracao de token. Usado por scripts/test-backup-drive.ts.
 */

import crypto from 'node:crypto'
import http from 'node:http'
import { AddressInfo } from 'node:net'

export interface ArquivoMock {
  id: string
  nome: string
  parents: string[]
  mimeType: string
  appProperties: Record<string, string>
  conteudo: Buffer
  criadoEm: string
}

export interface FalhasSimuladas {
  /** Derruba a conexao ao receber o chunk de indice N (0-based). */
  cortarNoChunk?: number
  /** Responde 503 com Retry-After no chunk de indice N. */
  erro503NoChunk?: number
  /** Responde 429 nas N primeiras listagens. */
  status429NasListagens?: number
  /** O broker responde 401 invalid_broker_token. */
  brokerInvalido?: boolean
  /** access_token vale poucos segundos, forcando renovacao. */
  tokenCurto?: boolean
  /** Responde 401 na primeira chamada autenticada (token vencido no Google). */
  tokenVencidoUmaVez?: boolean
}

export interface EstatisticasMock {
  chamadasToken: number
  chunksRecebidos: number
  sessoesCriadas: number
  uploadsMultipart: number
  listagens: number
  downloads: number
  exclusoes: number
}

interface Sessao {
  id: string
  nome: string
  parents: string[]
  appProperties: Record<string, string>
  tamanho: number
  recebido: Buffer[]
  bytes: number
  chunks: number
}

export class MockDrive {
  readonly arquivos = new Map<string, ArquivoMock>()
  falhas: FalhasSimuladas = {}
  estatisticas: EstatisticasMock = {
    chamadasToken: 0,
    chunksRecebidos: 0,
    sessoesCriadas: 0,
    uploadsMultipart: 0,
    listagens: 0,
    downloads: 0,
    exclusoes: 0,
  }

  private readonly sessoes = new Map<string, Sessao>()
  private servidor: http.Server | null = null
  private porta = 0
  private tokenAtual = ''
  private umaFalha401 = false

  get baseUrl(): string {
    return `http://127.0.0.1:${this.porta}`
  }

  get apiBase(): string {
    return `${this.baseUrl}/drive/v3`
  }

  get uploadBase(): string {
    return `${this.baseUrl}/upload/drive/v3`
  }

  zerarEstatisticas(): void {
    this.estatisticas = {
      chamadasToken: 0,
      chunksRecebidos: 0,
      sessoesCriadas: 0,
      uploadsMultipart: 0,
      listagens: 0,
      downloads: 0,
      exclusoes: 0,
    }
    this.umaFalha401 = false
  }

  criarPasta(nome: string, parent = 'root'): ArquivoMock {
    const arquivo: ArquivoMock = {
      id: `pasta-${crypto.randomBytes(6).toString('hex')}`,
      nome,
      parents: [parent],
      mimeType: 'application/vnd.google-apps.folder',
      appProperties: {},
      conteudo: Buffer.alloc(0),
      criadoEm: new Date().toISOString(),
    }
    this.arquivos.set(arquivo.id, arquivo)
    return arquivo
  }

  async iniciar(): Promise<void> {
    this.servidor = http.createServer((req, res) => {
      this.tratar(req, res).catch((erro) => {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: { message: String(erro) } }))
      })
    })

    await new Promise<void>((resolve) => {
      this.servidor!.listen(0, '127.0.0.1', () => {
        this.porta = (this.servidor!.address() as AddressInfo).port
        resolve()
      })
    })
  }

  async parar(): Promise<void> {
    if (!this.servidor) return
    await new Promise<void>((resolve) => this.servidor!.close(() => resolve()))
    this.servidor = null
  }

  // -------------------------------------------------------------- roteamento

  private async tratar(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', this.baseUrl)
    const caminho = url.pathname

    if (caminho === '/api/broker/gdrive/token' && req.method === 'POST') {
      return this.rotaToken(req, res)
    }

    if (caminho === '/api/broker/gdrive/revoke' && req.method === 'POST') {
      return this.json(res, 200, { ok: true })
    }

    // Todas as rotas do "Google" exigem o access_token emitido pelo broker.
    const auth = req.headers.authorization
    if (!auth || auth !== `Bearer ${this.tokenAtual}` || this.tokenAtual === '') {
      return this.json(res, 401, { error: { message: 'Invalid Credentials' } })
    }

    if (this.falhas.tokenVencidoUmaVez && !this.umaFalha401) {
      this.umaFalha401 = true
      return this.json(res, 401, { error: { message: 'Invalid Credentials' } })
    }

    if (caminho.startsWith('/resumable/') && req.method === 'PUT') {
      return this.rotaChunk(req, res, caminho.slice('/resumable/'.length))
    }

    if (caminho === '/upload/drive/v3/files' && req.method === 'POST') {
      const tipo = url.searchParams.get('uploadType')
      if (tipo === 'resumable') return this.rotaIniciarSessao(req, res)
      if (tipo === 'multipart') return this.rotaMultipart(req, res)
      return this.json(res, 400, { error: { message: 'uploadType nao suportado' } })
    }

    if (caminho === '/drive/v3/files' && req.method === 'GET') return this.rotaListar(req, res, url)
    if (caminho === '/drive/v3/files' && req.method === 'POST') return this.rotaCriarPasta(req, res)
    if (caminho === '/drive/v3/about' && req.method === 'GET') {
      return this.json(res, 200, {
        storageQuota: { limit: '16106127360', usage: '1073741824' },
        user: { emailAddress: 'teste@exemplo.com' },
      })
    }

    const arquivoMatch = /^\/drive\/v3\/files\/([^/]+)$/.exec(caminho)
    if (arquivoMatch) {
      const id = decodeURIComponent(arquivoMatch[1])
      if (req.method === 'DELETE') return this.rotaExcluir(res, id)
      if (req.method === 'GET') return this.rotaObter(res, url, id)
    }

    this.json(res, 404, { error: { message: `Rota nao encontrada: ${req.method} ${caminho}` } })
  }

  // -------------------------------------------------------------- rotas

  private async rotaToken(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    this.estatisticas.chamadasToken += 1

    if (this.falhas.brokerInvalido) {
      return this.json(res, 401, { error: 'invalid_broker_token' })
    }

    const auth = req.headers.authorization ?? ''
    if (!auth.startsWith('Bearer bk_')) {
      return this.json(res, 401, { error: 'missing_broker_token' })
    }

    this.tokenAtual = `ya29.${crypto.randomBytes(12).toString('hex')}`

    // expires_in curto derruba o cache (que reserva 10 min de folga) e obriga a renovar.
    this.json(res, 200, {
      access_token: this.tokenAtual,
      expires_in: this.falhas.tokenCurto ? 630 : 3599,
    })
  }

  private async rotaIniciarSessao(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const corpo = JSON.parse((await this.lerCorpo(req)).toString('utf8')) as {
      name: string
      parents?: string[]
      appProperties?: Record<string, string>
    }

    const parent = corpo.parents?.[0] ?? 'root'
    if (parent !== 'root' && !this.arquivos.has(parent)) {
      return this.json(res, 404, { error: { message: 'File not found: parent' } })
    }

    const id = crypto.randomBytes(8).toString('hex')
    this.sessoes.set(id, {
      id,
      nome: corpo.name,
      parents: corpo.parents ?? ['root'],
      appProperties: corpo.appProperties ?? {},
      tamanho: Number(req.headers['x-upload-content-length'] ?? 0),
      recebido: [],
      bytes: 0,
      chunks: 0,
    })

    this.estatisticas.sessoesCriadas += 1
    res.writeHead(200, { Location: `${this.baseUrl}/resumable/${id}` })
    res.end()
  }

  private async rotaChunk(req: http.IncomingMessage, res: http.ServerResponse, id: string): Promise<void> {
    const sessao = this.sessoes.get(id)
    if (!sessao) return this.json(res, 404, { error: { message: 'Sessao de envio desconhecida' } })

    const contentRange = String(req.headers['content-range'] ?? '')
    const consulta = /^bytes \*\/(\d+)$/.exec(contentRange)

    // Consulta de posicao (retomada): responde onde parou.
    if (consulta) {
      if (sessao.bytes >= sessao.tamanho && sessao.tamanho > 0) {
        const arquivo = this.materializar(sessao)
        return this.json(res, 200, { id: arquivo.id, name: arquivo.nome, size: String(arquivo.conteudo.length) })
      }
      res.writeHead(308, sessao.bytes > 0 ? { Range: `bytes=0-${sessao.bytes - 1}` } : {})
      res.end()
      return
    }

    const faixa = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange)
    if (!faixa) return this.json(res, 400, { error: { message: `Content-Range invalido: ${contentRange}` } })

    const inicio = Number(faixa[1])
    const total = Number(faixa[3])
    const indiceChunk = sessao.chunks

    if (this.falhas.cortarNoChunk === indiceChunk) {
      // Simula queda de rede no meio do envio.
      req.destroy()
      res.destroy()
      sessao.chunks += 1
      return
    }

    if (this.falhas.erro503NoChunk === indiceChunk) {
      sessao.chunks += 1
      res.writeHead(503, { 'Retry-After': '1', 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Backend Error' } }))
      return
    }

    const dados = await this.lerCorpo(req)

    if (inicio !== sessao.bytes) {
      // Cliente mandou de uma posicao diferente da esperada: rejeita como o Google faria.
      res.writeHead(308, sessao.bytes > 0 ? { Range: `bytes=0-${sessao.bytes - 1}` } : {})
      res.end()
      return
    }

    sessao.recebido.push(dados)
    sessao.bytes += dados.length
    sessao.chunks += 1
    this.estatisticas.chunksRecebidos += 1

    if (sessao.bytes >= total) {
      const arquivo = this.materializar(sessao)
      return this.json(res, 200, { id: arquivo.id, name: arquivo.nome, size: String(arquivo.conteudo.length) })
    }

    res.writeHead(308, { Range: `bytes=0-${sessao.bytes - 1}` })
    res.end()
  }

  private materializar(sessao: Sessao): ArquivoMock {
    const arquivo: ArquivoMock = {
      id: `arq-${crypto.randomBytes(6).toString('hex')}`,
      nome: sessao.nome,
      parents: sessao.parents,
      mimeType: 'application/gzip',
      appProperties: sessao.appProperties,
      conteudo: Buffer.concat(sessao.recebido),
      criadoEm: new Date().toISOString(),
    }

    this.arquivos.set(arquivo.id, arquivo)
    this.sessoes.delete(sessao.id)
    return arquivo
  }

  private async rotaMultipart(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const tipo = String(req.headers['content-type'] ?? '')
    const boundary = /boundary=(.+)$/.exec(tipo)?.[1]
    if (!boundary) return this.json(res, 400, { error: { message: 'boundary ausente' } })

    const corpo = await this.lerCorpo(req)
    const separador = Buffer.from(`--${boundary}`)

    const partes: Buffer[] = []
    let posicao = corpo.indexOf(separador)
    while (posicao !== -1) {
      const proxima = corpo.indexOf(separador, posicao + separador.length)
      if (proxima === -1) break
      partes.push(corpo.subarray(posicao + separador.length, proxima))
      posicao = proxima
    }

    const conteudoDaParte = (parte: Buffer): Buffer => {
      const marca = parte.indexOf('\r\n\r\n')
      return marca === -1 ? Buffer.alloc(0) : parte.subarray(marca + 4, parte.length - 2)
    }

    const metadata = JSON.parse(conteudoDaParte(partes[0]).toString('utf8')) as {
      name: string
      parents?: string[]
      appProperties?: Record<string, string>
    }
    const conteudo = conteudoDaParte(partes[1])

    const destino = metadata.parents?.[0] ?? 'root'
    if (destino !== 'root' && !this.arquivos.has(destino)) {
      return this.json(res, 404, { error: { message: 'File not found: parent' } })
    }

    const arquivo: ArquivoMock = {
      id: `arq-${crypto.randomBytes(6).toString('hex')}`,
      nome: metadata.name,
      parents: metadata.parents ?? ['root'],
      mimeType: 'application/gzip',
      appProperties: metadata.appProperties ?? {},
      conteudo,
      criadoEm: new Date().toISOString(),
    }

    this.arquivos.set(arquivo.id, arquivo)
    this.estatisticas.uploadsMultipart += 1

    this.json(res, 200, { id: arquivo.id, name: arquivo.nome, size: String(conteudo.length) })
  }

  private async rotaListar(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
    this.estatisticas.listagens += 1

    if (this.falhas.status429NasListagens && this.estatisticas.listagens <= this.falhas.status429NasListagens) {
      res.writeHead(429, { 'Retry-After': '1', 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: { message: 'Rate Limit Exceeded' } }))
      return
    }

    const q = url.searchParams.get('q') ?? ''
    const parent = /'([^']+)' in parents/.exec(q)?.[1]
    const nome = /name = '([^']*)'/.exec(q)?.[1]
    const querPasta = q.includes("mimeType = 'application/vnd.google-apps.folder'")
    const querApp = q.includes("key='app'")

    const arquivos = [...this.arquivos.values()]
      .filter((a) => (parent ? a.parents.includes(parent) : true))
      .filter((a) => (nome !== undefined ? a.nome === nome : true))
      .filter((a) => (querPasta ? a.mimeType === 'application/vnd.google-apps.folder' : true))
      .filter((a) => (querApp ? a.appProperties.app === 'portal-transparencia' : true))
      .sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))

    this.json(res, 200, {
      files: arquivos.map((a) => ({
        id: a.id,
        name: a.nome,
        size: String(a.conteudo.length),
        createdTime: a.criadoEm,
        appProperties: a.appProperties,
      })),
    })
  }

  private async rotaCriarPasta(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const corpo = JSON.parse((await this.lerCorpo(req)).toString('utf8')) as {
      name: string
      parents?: string[]
    }
    const pasta = this.criarPasta(corpo.name, corpo.parents?.[0] ?? 'root')
    this.json(res, 200, { id: pasta.id, name: pasta.nome })
  }

  private rotaObter(res: http.ServerResponse, url: URL, id: string): void {
    const arquivo = this.arquivos.get(id)
    if (!arquivo) return this.json(res, 404, { error: { message: 'File not found' } })

    if (url.searchParams.get('alt') === 'media') {
      this.estatisticas.downloads += 1
      res.writeHead(200, {
        'Content-Type': arquivo.mimeType,
        'Content-Length': String(arquivo.conteudo.length),
      })
      return void res.end(arquivo.conteudo)
    }

    this.json(res, 200, {
      id: arquivo.id,
      name: arquivo.nome,
      parents: arquivo.parents,
      size: String(arquivo.conteudo.length),
      trashed: false,
    })
  }

  private rotaExcluir(res: http.ServerResponse, id: string): void {
    this.estatisticas.exclusoes += 1
    this.arquivos.delete(id)
    res.writeHead(204)
    res.end()
  }

  // -------------------------------------------------------------- utilidades

  private lerCorpo(req: http.IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const partes: Buffer[] = []
      req.on('data', (parte: Buffer) => partes.push(parte))
      req.on('end', () => resolve(Buffer.concat(partes)))
      req.on('error', reject)
    })
  }

  private json(res: http.ServerResponse, status: number, corpo: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(corpo))
  }
}
