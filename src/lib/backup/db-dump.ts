/**
 * Dump logico do MariaDB/MySQL em streaming, sem depender do binario `mysqldump`
 * (que nao existe no servidor). Le linha a linha com mysql2 e escreve SQL direto
 * no stream de saida, entao o consumo de memoria nao cresce com o tamanho da tabela.
 *
 * O conteudo gerado e deterministico (sem data no cabecalho, linhas ordenadas pela
 * chave primaria) para que o hash do dump possa ser usado na deduplicacao.
 */

import type { Writable } from 'node:stream'
import mysql, { type Connection, type FieldPacket } from 'mysql2/promise'
import type { Connection as ConexaoCrua } from 'mysql2'

/**
 * Codigos de tipo do protocolo MySQL. A decisao do literal e feita pelo tipo da
 * coluna, nao pelo charset: datas e numeros tambem chegam com charset "binary" (63)
 * no protocolo texto, entao usar so o charset transformaria DATETIME em 0x...
 */
const TIPOS_NUMERICOS = new Set([0, 1, 2, 3, 4, 5, 8, 9, 13, 246])
const TIPOS_DATA = new Set([7, 10, 11, 12, 14])
/** Tipos que podem ser texto ou binario dependendo do charset da coluna. */
const TIPOS_TEXTO_OU_BLOB = new Set([15, 245, 247, 248, 249, 250, 251, 252, 253, 254])
const CHARSET_BINARIO = 63
const TIPO_GEOMETRY = 255
const TIPO_BIT = 16

export interface TabelaDump {
  nome: string
  registros: number
}

export interface DumpStats {
  tabelas: TabelaDump[]
  views: string[]
  totalRegistros: number
  bytes: number
  avisos: string[]
  banco: string
  versaoServidor: string
}

/**
 * Tabelas de controle do proprio backup ficam de fora do dump:
 * - backup_jobs muda a cada execucao e faria a deduplicacao nunca casar;
 * - backup_drive_contas guarda o token cifrado do Drive, que nao deve viajar
 *   junto com o pacote enviado para a nuvem.
 */
export const TABELAS_IGNORADAS_PADRAO = ['backup_jobs', 'backup_drive_contas']

export interface DumpOptions {
  /** Limite de bytes por comando INSERT (default: derivado de max_allowed_packet). */
  maxBytesPorInsert?: number
  /** Tabelas que nao entram no dump (default: TABELAS_IGNORADAS_PADRAO). */
  ignorarTabelas?: string[]
  onProgresso?: (info: { tabela: string; registros: number }) => void
}

function escreverAsync(out: Writable, texto: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (out.write(texto)) {
      resolve()
      return
    }
    const aoErrar = (erro: Error) => {
      out.off('drain', aoDrenar)
      reject(erro)
    }
    const aoDrenar = () => {
      out.off('error', aoErrar)
      resolve()
    }
    out.once('drain', aoDrenar)
    out.once('error', aoErrar)
  })
}

export function escaparIdentificador(nome: string): string {
  return `\`${nome.replace(/`/g, '``')}\``
}

/** Escapa uma string para literal SQL do MySQL/MariaDB (modo padrao, sem NO_BACKSLASH_ESCAPES). */
export function escaparString(valor: string): string {
  let saida = "'"
  for (const char of valor) {
    switch (char) {
      case '\0':
        saida += '\\0'
        break
      case '\b':
        saida += '\\b'
        break
      case '\n':
        saida += '\\n'
        break
      case '\r':
        saida += '\\r'
        break
      case '\t':
        saida += '\\t'
        break
      case '\x1a':
        saida += '\\Z'
        break
      case '\\':
        saida += '\\\\'
        break
      case "'":
        saida += "\\'"
        break
      case '"':
        saida += '\\"'
        break
      default:
        saida += char
    }
  }
  return saida + "'"
}

/** Converte o buffer bruto do protocolo texto no literal SQL correspondente. */
export function literalSql(valor: Buffer | null, campo: FieldPacket): string {
  if (valor === null || valor === undefined) return 'NULL'

  const tipo = (campo as unknown as { columnType?: number; type?: number }).columnType
    ?? (campo as unknown as { type?: number }).type
    ?? 0
  const charset = (campo as unknown as { characterSet?: number }).characterSet ?? 0

  if (TIPOS_NUMERICOS.has(tipo)) {
    const texto = valor.toString('latin1')
    return texto.length > 0 ? texto : 'NULL'
  }

  if (TIPOS_DATA.has(tipo)) {
    return escaparString(valor.toString('latin1'))
  }

  if (tipo === TIPO_BIT || tipo === TIPO_GEOMETRY) {
    return valor.length === 0 ? "''" : `0x${valor.toString('hex')}`
  }

  if (TIPOS_TEXTO_OU_BLOB.has(tipo) && charset === CHARSET_BINARIO) {
    return valor.length === 0 ? "''" : `0x${valor.toString('hex')}`
  }

  return escaparString(valor.toString('utf8'))
}

/**
 * Monta a config do mysql2 para o dump.
 *
 * Usa BACKUP_DATABASE_URL quando definida (util para apontar o backup a um usuario
 * so-leitura ou a uma replica); caso contrario, a mesma DATABASE_URL do Prisma.
 */
export function configDaUrl(
  url = process.env.BACKUP_DATABASE_URL?.trim() || process.env.DATABASE_URL
): mysql.ConnectionOptions {
  if (!url) throw new Error('DATABASE_URL nao definida')

  const parsed = new URL(url)
  if (!parsed.protocol.startsWith('mysql')) {
    throw new Error(`Protocolo nao suportado no backup de banco: ${parsed.protocol}`)
  }

  const sslParam = parsed.searchParams.get('sslaccept') || parsed.searchParams.get('ssl-mode')
  const config: mysql.ConnectionOptions = {
    host: decodeURIComponent(parsed.hostname),
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    charset: 'utf8mb4',
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  }

  if (sslParam && sslParam !== 'disabled' && sslParam !== 'DISABLED') {
    config.ssl = { rejectUnauthorized: sslParam === 'strict' }
  }

  return config
}

async function colunasDaTabela(conn: Connection, tabela: string): Promise<string[]> {
  const [linhas] = await conn.query<mysql.RowDataPacket[]>(
    'SELECT COLUMN_NAME AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
    [tabela]
  )
  return linhas.map((l) => String(l.c))
}

async function chavePrimaria(conn: Connection, tabela: string): Promise<string[]> {
  const [linhas] = await conn.query<mysql.RowDataPacket[]>(
    `SELECT COLUMN_NAME AS c FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = 'PRIMARY'
      ORDER BY SEQ_IN_INDEX`,
    [tabela]
  )
  return linhas.map((l) => String(l.c))
}

export async function dumpDatabase(out: Writable, opcoes: DumpOptions = {}): Promise<DumpStats> {
  const conn = await mysql.createConnection({ ...configDaUrl(), multipleStatements: false })

  const stats: DumpStats = {
    tabelas: [],
    views: [],
    totalRegistros: 0,
    bytes: 0,
    avisos: [],
    banco: '',
    versaoServidor: '',
  }

  let bytes = 0
  const escrever = async (texto: string) => {
    bytes += Buffer.byteLength(texto)
    await escreverAsync(out, texto)
  }

  try {
    const [infoLinhas] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT DATABASE() AS db, VERSION() AS versao, @@max_allowed_packet AS pacote'
    )
    stats.banco = String(infoLinhas[0]?.db ?? '')
    stats.versaoServidor = String(infoLinhas[0]?.versao ?? '')

    const maxPacote = Number(infoLinhas[0]?.pacote ?? 4 * 1024 * 1024)
    const limiteInsert = Math.max(
      64 * 1024,
      Math.min(opcoes.maxBytesPorInsert ?? Math.floor(maxPacote * 0.6), 8 * 1024 * 1024)
    )

    // Snapshot consistente sem travar o site (InnoDB / MVCC).
    await conn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ')
    await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT')

    await escrever(
      '-- Portal da Transparencia :: dump logico do banco\n' +
        '-- Gerado pelo sistema de backup interno (sem mysqldump).\n' +
        '-- ATENCAO: este script recria as tabelas listadas (DROP TABLE IF EXISTS).\n\n' +
        '/*!40101 SET NAMES utf8mb4 */;\n' +
        "/*!40101 SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;\n" +
        'SET FOREIGN_KEY_CHECKS=0;\n' +
        'SET UNIQUE_CHECKS=0;\n' +
        'SET AUTOCOMMIT=0;\n' +
        'START TRANSACTION;\n\n'
    )

    const [tabelasLinhas] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT TABLE_NAME AS nome, TABLE_TYPE AS tipo FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() ORDER BY TABLE_NAME`
    )

    const ignoradas = new Set(
      (opcoes.ignorarTabelas ?? TABELAS_IGNORADAS_PADRAO).map((t) => t.toLowerCase())
    )

    const tabelas = tabelasLinhas
      .filter((l) => l.tipo === 'BASE TABLE')
      .map((l) => String(l.nome))
      .filter((nome) => {
        if (!ignoradas.has(nome.toLowerCase())) return true
        stats.avisos.push(`Tabela ${nome} nao entra no dump (tabela de controle do proprio backup).`)
        return false
      })

    const views = tabelasLinhas.filter((l) => l.tipo === 'VIEW').map((l) => String(l.nome))

    for (const tabela of tabelas) {
      const [criacao] = await conn.query<mysql.RowDataPacket[]>(
        `SHOW CREATE TABLE ${escaparIdentificador(tabela)}`
      )
      const ddl = String(criacao[0]?.['Create Table'] ?? '')

      await escrever(
        `--\n-- Estrutura da tabela ${escaparIdentificador(tabela)}\n--\n` +
          `DROP TABLE IF EXISTS ${escaparIdentificador(tabela)};\n${ddl};\n\n`
      )

      const colunas = await colunasDaTabela(conn, tabela)
      const pk = await chavePrimaria(conn, tabela)
      if (pk.length === 0) {
        stats.avisos.push(`Tabela ${tabela} sem chave primaria: ordem das linhas pode variar entre backups.`)
      }

      const listaColunas = colunas.map(escaparIdentificador).join(', ')
      const ordem = pk.length > 0 ? ` ORDER BY ${pk.map(escaparIdentificador).join(', ')}` : ''
      const sql = `SELECT ${listaColunas} FROM ${escaparIdentificador(tabela)}${ordem}`

      let campos: FieldPacket[] = []
      // A conexao "crua" do mysql2 e quem expoe query().stream() com backpressure.
      const cru = (conn as unknown as { connection: ConexaoCrua }).connection
      const query = cru.query({ sql, typeCast: false, rowsAsArray: true })
      query.on('fields', (fs: FieldPacket[]) => {
        campos = fs
      })

      const stream = query.stream({ highWaterMark: 128 })

      let registros = 0
      let bufferValores: string[] = []
      let bytesBuffer = 0
      const prefixo = `INSERT INTO ${escaparIdentificador(tabela)} (${listaColunas}) VALUES\n`

      const descarregar = async () => {
        if (bufferValores.length === 0) return
        await escrever(prefixo + bufferValores.join(',\n') + ';\n')
        bufferValores = []
        bytesBuffer = 0
      }

      let escreveuCabecalho = false
      for await (const linha of stream as AsyncIterable<Array<Buffer | null>>) {
        if (!escreveuCabecalho) {
          await escrever(`--\n-- Dados da tabela ${escaparIdentificador(tabela)}\n--\n`)
          escreveuCabecalho = true
        }

        const valores = linha.map((valor, i) => literalSql(valor, campos[i]))
        const tupla = `(${valores.join(',')})`

        bufferValores.push(tupla)
        bytesBuffer += tupla.length + 2
        registros += 1

        if (bytesBuffer >= limiteInsert) {
          await descarregar()
        }
      }

      await descarregar()
      if (escreveuCabecalho) await escrever('\n')

      stats.tabelas.push({ nome: tabela, registros })
      stats.totalRegistros += registros
      opcoes.onProgresso?.({ tabela, registros })
    }

    for (const view of views) {
      const [criacao] = await conn.query<mysql.RowDataPacket[]>(
        `SHOW CREATE VIEW ${escaparIdentificador(view)}`
      )
      const ddl = String(criacao[0]?.['Create View'] ?? '')
      if (!ddl) continue
      await escrever(
        `--\n-- View ${escaparIdentificador(view)}\n--\n` +
          `DROP VIEW IF EXISTS ${escaparIdentificador(view)};\n${ddl};\n\n`
      )
      stats.views.push(view)
    }

    await conn.query('COMMIT')

    await escrever('COMMIT;\nSET FOREIGN_KEY_CHECKS=1;\nSET UNIQUE_CHECKS=1;\n-- fim do dump\n')

    stats.bytes = bytes
    return stats
  } finally {
    await conn.end().catch(() => undefined)
  }
}
