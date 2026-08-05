#!/usr/bin/env npx tsx
/**
 * Restauracao de um pacote de backup.
 *
 * Por seguranca, roda em modo simulacao (dry-run) por padrao: valida o pacote,
 * o manifesto e todos os comandos SQL sem tocar em nada. Para aplicar de verdade
 * e obrigatorio passar --aplicar e confirmar digitando o nome do banco.
 *
 * Uso:
 *   npx tsx scripts/restore-backup.ts --arquivo backups/portal-backup-....tar.gz
 *   npx tsx scripts/restore-backup.ts --arquivo ... --aplicar --banco --midias
 */

import 'dotenv/config'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline/promises'

interface Argumentos {
  arquivo: string
  aplicar: boolean
  banco: boolean
  midias: boolean
  destinoMidias: string | null
}

function lerArgumentos(): Argumentos {
  const args = process.argv.slice(2)
  const valor = (nome: string): string | null => {
    const i = args.indexOf(nome)
    return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null
  }

  const arquivo = valor('--arquivo') ?? valor('--file') ?? ''
  if (!arquivo) {
    console.error('Informe o pacote: --arquivo <caminho do .tar.gz>')
    process.exit(1)
  }

  const banco = args.includes('--banco')
  const midias = args.includes('--midias')

  return {
    arquivo: path.resolve(arquivo),
    aplicar: args.includes('--aplicar'),
    // Sem escolha explicita, considera os dois conteudos.
    banco: banco || !midias,
    midias: midias || !banco,
    destinoMidias: valor('--destino-midias'),
  }
}

export interface Manifesto {
  versao: number
  app: string
  gerado_em: string
  escopo: string
  content_hash: string
  banco: {
    nome: string
    versao_servidor: string
    total_registros: number
    bytes_dump: number
    sha256_dump: string
    tabelas: Array<{ nome: string; registros: number }>
    views: string[]
  } | null
  midias: {
    total_arquivos: number
    total_bytes: number
    raizes: string[]
    arquivos: Array<{ caminho: string; tamanho: number; sha256: string }>
  } | null
  avisos: string[]
}

export interface RelatorioVerificacao {
  manifesto: Manifesto
  comandosSql: number
  tabelasNoDump: string[]
  shaDumpConfere: boolean | null
  arquivosConferidos: number
  arquivosDivergentes: string[]
  problemas: string[]
}

/** Conta comandos SQL de nivel superior, respeitando strings, escapes e comentarios. */
export function contarComandosSql(sql: string): { total: number; tabelas: string[] } {
  let total = 0
  let dentroDeString: string | null = null
  let escapando = false
  let comentarioLinha = false

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i]

    if (comentarioLinha) {
      if (char === '\n') comentarioLinha = false
      continue
    }

    if (dentroDeString) {
      if (escapando) {
        escapando = false
        continue
      }
      if (char === '\\') escapando = true
      else if (char === dentroDeString) dentroDeString = null
      continue
    }

    if (char === "'" || char === '"' || char === '`') {
      dentroDeString = char
      continue
    }

    if (char === '-' && sql[i + 1] === '-') {
      comentarioLinha = true
      continue
    }

    if (char === ';') total += 1
  }

  const tabelas = [...sql.matchAll(/CREATE TABLE `([^`]+)`/g)].map((m) => m[1])
  return { total, tabelas }
}

async function extrairPara(arquivo: string, destino: string): Promise<void> {
  const tar = await import('tar')
  await fs.promises.mkdir(destino, { recursive: true })
  await tar.extract({ file: arquivo, cwd: destino })
}

export async function verificarPacote(arquivo: string): Promise<{ relatorio: RelatorioVerificacao; pasta: string }> {
  const pasta = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pt-restore-'))
  await extrairPara(arquivo, pasta)

  const problemas: string[] = []
  const caminhoManifesto = path.join(pasta, 'manifest.json')

  if (!fs.existsSync(caminhoManifesto)) {
    throw new Error('Pacote invalido: manifest.json nao encontrado.')
  }

  const manifesto = JSON.parse(await fs.promises.readFile(caminhoManifesto, 'utf8')) as Manifesto

  let comandosSql = 0
  let tabelasNoDump: string[] = []
  let shaDumpConfere: boolean | null = null

  const caminhoDump = path.join(pasta, 'database', 'dump.sql')
  if (fs.existsSync(caminhoDump)) {
    const sql = await fs.promises.readFile(caminhoDump, 'utf8')
    const contagem = contarComandosSql(sql)
    comandosSql = contagem.total
    tabelasNoDump = contagem.tabelas

    const sha = crypto.createHash('sha256').update(await fs.promises.readFile(caminhoDump)).digest('hex')
    if (manifesto.banco?.sha256_dump) {
      shaDumpConfere = sha === manifesto.banco.sha256_dump
      if (!shaDumpConfere) problemas.push('O sha256 do dump nao confere com o manifesto.')
    }

    const esperadas = (manifesto.banco?.tabelas ?? []).map((t) => t.nome).sort()
    const faltando = esperadas.filter((t) => !tabelasNoDump.includes(t))
    if (faltando.length > 0) problemas.push(`Tabelas do manifesto ausentes no dump: ${faltando.join(', ')}`)
  } else if (manifesto.banco) {
    problemas.push('O manifesto indica dump de banco, mas database/dump.sql nao esta no pacote.')
  }

  let arquivosConferidos = 0
  const arquivosDivergentes: string[] = []

  for (const arquivoMidia of manifesto.midias?.arquivos ?? []) {
    const completo = path.join(pasta, arquivoMidia.caminho)
    if (!fs.existsSync(completo)) {
      arquivosDivergentes.push(`${arquivoMidia.caminho} (ausente)`)
      continue
    }

    const sha = crypto.createHash('sha256').update(await fs.promises.readFile(completo)).digest('hex')
    if (sha !== arquivoMidia.sha256) arquivosDivergentes.push(`${arquivoMidia.caminho} (sha256 diferente)`)
    else arquivosConferidos += 1
  }

  if (arquivosDivergentes.length > 0) {
    problemas.push(`${arquivosDivergentes.length} arquivo(s) de midia divergentes do manifesto.`)
  }

  return {
    pasta,
    relatorio: {
      manifesto,
      comandosSql,
      tabelasNoDump,
      shaDumpConfere,
      arquivosConferidos,
      arquivosDivergentes,
      problemas,
    },
  }
}

async function aplicarBanco(pasta: string): Promise<void> {
  const { configDaUrl } = await import('../src/lib/backup/db-dump')
  const mysql = (await import('mysql2/promise')).default

  const caminhoDump = path.join(pasta, 'database', 'dump.sql')
  const sql = await fs.promises.readFile(caminhoDump, 'utf8')

  const conn = await mysql.createConnection({ ...configDaUrl(), multipleStatements: true })
  try {
    console.log('Aplicando o dump no banco...')
    await conn.query(sql)
    console.log('Dump aplicado.')
  } finally {
    await conn.end()
  }
}

async function aplicarMidias(pasta: string, destino: string): Promise<number> {
  const origem = path.join(pasta, 'media')
  if (!fs.existsSync(origem)) return 0

  let copiados = 0
  const copiar = async (dir: string) => {
    for (const entrada of await fs.promises.readdir(dir, { withFileTypes: true })) {
      const completo = path.join(dir, entrada.name)
      if (entrada.isDirectory()) {
        await copiar(completo)
        continue
      }
      const relativo = path.relative(origem, completo)
      const alvo = path.join(destino, relativo)
      await fs.promises.mkdir(path.dirname(alvo), { recursive: true })
      await fs.promises.copyFile(completo, alvo)
      copiados += 1
    }
  }

  await copiar(origem)
  return copiados
}

async function main() {
  const args = lerArgumentos()

  if (!fs.existsSync(args.arquivo)) {
    console.error(`Pacote nao encontrado: ${args.arquivo}`)
    process.exit(1)
  }

  console.log(`Pacote: ${args.arquivo}`)
  console.log(`Modo: ${args.aplicar ? 'APLICAR (altera dados)' : 'simulacao (nada e alterado)'}\n`)

  const { relatorio, pasta } = await verificarPacote(args.arquivo)
  const m = relatorio.manifesto

  console.log(`Gerado em ......: ${m.gerado_em}`)
  console.log(`Escopo .........: ${m.escopo}`)
  console.log(`Impressao ......: ${m.content_hash.slice(0, 24)}...`)

  if (m.banco) {
    console.log(`Banco ..........: ${m.banco.nome} (${m.banco.versao_servidor})`)
    console.log(`  tabelas ......: ${m.banco.tabelas.length} | registros: ${m.banco.total_registros}`)
    console.log(`  comandos SQL .: ${relatorio.comandosSql}`)
    console.log(`  sha256 do dump: ${relatorio.shaDumpConfere === false ? 'DIVERGENTE' : 'confere'}`)
  }

  if (m.midias) {
    console.log(`Midias .........: ${m.midias.total_arquivos} arquivo(s)`)
    console.log(`  conferidos ...: ${relatorio.arquivosConferidos}`)
    if (relatorio.arquivosDivergentes.length > 0) {
      console.log(`  divergentes ..: ${relatorio.arquivosDivergentes.slice(0, 10).join(', ')}`)
    }
  }

  if (relatorio.problemas.length > 0) {
    console.log('\nPROBLEMAS ENCONTRADOS:')
    for (const problema of relatorio.problemas) console.log(` - ${problema}`)
  } else {
    console.log('\nPacote integro: manifesto, dump e midias conferem.')
  }

  if (!args.aplicar) {
    console.log('\nSimulacao concluida. Nada foi alterado.')
    console.log('Para restaurar de verdade, rode de novo com --aplicar.')
    await fs.promises.rm(pasta, { recursive: true, force: true })
    return
  }

  if (relatorio.problemas.length > 0) {
    console.error('\nRestauracao cancelada: corrija os problemas acima ou use outro pacote.')
    await fs.promises.rm(pasta, { recursive: true, force: true })
    process.exit(1)
  }

  const nomeBanco = m.banco?.nome ?? ''
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log('\nATENCAO: a restauracao SOBRESCREVE os dados atuais.')
  const resposta = await rl.question(`Digite o nome do banco (${nomeBanco}) para confirmar: `)
  rl.close()

  if (resposta.trim() !== nomeBanco) {
    console.error('Confirmacao invalida. Nada foi alterado.')
    await fs.promises.rm(pasta, { recursive: true, force: true })
    process.exit(1)
  }

  if (args.banco && m.banco) await aplicarBanco(pasta)

  if (args.midias && m.midias) {
    const destino = args.destinoMidias
      ? path.resolve(args.destinoMidias)
      : path.resolve(process.cwd(), 'public')
    const copiados = await aplicarMidias(pasta, destino)
    console.log(`Midias restauradas: ${copiados} arquivo(s) em ${destino}.`)
  }

  await fs.promises.rm(pasta, { recursive: true, force: true })
  console.log('\nRestauracao concluida.')
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main().catch((erro) => {
    console.error('Falha na restauracao:', erro)
    process.exit(1)
  })
}
