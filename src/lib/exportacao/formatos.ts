/**
 * Formatos abertos de exportacao (LAI): CSV e XLSX (o JSON sai direto dos registros).
 *
 * O XLSX e gerado aqui mesmo (um ZIP com as partes minimas do SpreadsheetML), sem dependencia
 * externa: so precisamos escrever uma planilha simples, com cabecalho, numeros e datas.
 */

import { deflateRawSync } from 'node:zlib'

export type TipoColuna = 'texto' | 'numero' | 'moeda' | 'data'

export interface Coluna<T> {
  titulo: string
  valor: (linha: T) => unknown
  tipo?: TipoColuna
}

const OFFSET_MANAUS_MS = -4 * 60 * 60 * 1000

/** Data no relogio de Manaus ("2025-01-02"); as datas do portal sao gravadas nesse fuso. */
function dataIso(data: Date): string {
  return new Date(data.getTime() + OFFSET_MANAUS_MS).toISOString().slice(0, 10)
}

function comoData(valor: unknown): Date | null {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor
  return null
}

// ---------------------------------------------------------------- CSV

function celulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const data = comoData(valor)
  const texto = data ? dataIso(data) : String(valor)
  return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** CSV com BOM (sem ele o Excel abre o UTF-8 com acentos quebrados), datas ISO e ponto decimal. */
export function gerarCsv<T>(linhas: T[], colunas: Array<Coluna<T>>): string {
  const cabecalho = colunas.map((c) => celulaCsv(c.titulo)).join(',')
  const corpo = linhas.map((linha) => colunas.map((c) => celulaCsv(c.valor(linha))).join(','))
  return '﻿' + [cabecalho, ...corpo].join('\r\n')
}

// ---------------------------------------------------------------- XLSX

const ESTILO = { cabecalho: 1, data: 2, moeda: 3 } as const

function escaparXml(texto: string): string {
  return texto
    // Caracteres de controle sao invalidos em XML e corrompem o arquivo.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function letraColuna(indice: number): string {
  let letra = ''
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letra = String.fromCharCode(65 + ((n - 1) % 26)) + letra
  }
  return letra
}

/** Numero de serie do Excel (dias desde 1899-12-30) para a data em Manaus. */
function serialExcel(data: Date): number {
  return Math.floor((data.getTime() + OFFSET_MANAUS_MS) / 86_400_000) + 25_569
}

function celulaXlsx(ref: string, valor: unknown, tipo: TipoColuna | undefined, estilo?: number): string {
  if (valor === null || valor === undefined || valor === '') return ''
  const s = estilo ? ` s="${estilo}"` : ''
  const data = comoData(valor)
  if (data) return `<c r="${ref}" s="${ESTILO.data}"><v>${serialExcel(data)}</v></c>`
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const formato = tipo === 'moeda' ? ` s="${ESTILO.moeda}"` : s
    return `<c r="${ref}"${formato}><v>${valor}</v></c>`
  }
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${escaparXml(String(valor))}</t></is></c>`
}

function planilhaXml<T>(linhas: T[], colunas: Array<Coluna<T>>): string {
  const ultima = letraColuna(Math.max(colunas.length - 1, 0))
  const cabecalho = colunas.map((c, i) => celulaXlsx(`${letraColuna(i)}1`, c.titulo, 'texto', ESTILO.cabecalho)).join('')
  const corpo = linhas.map((linha, l) => {
    const n = l + 2
    return `<row r="${n}">${colunas.map((c, i) => celulaXlsx(`${letraColuna(i)}${n}`, c.valor(linha), c.tipo)).join('')}</row>`
  })

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<sheetData><row r="1">${cabecalho}</row>${corpo.join('')}</sheetData>` +
    `<autoFilter ref="A1:${ultima}${linhas.length + 1}"/>` +
    '</worksheet>'
}

const PARTES_FIXAS: Record<string, string> = {
  '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>',
  '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>',
  'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets>' +
    '<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">Dados!$A$1:$A$1</definedName></definedNames>' +
    '</workbook>',
  'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
    '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    '</Relationships>',
  // Estilos: 0 padrao, 1 cabecalho em negrito, 2 data dd/mm/aaaa, 3 moeda com 2 casas.
  'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>' +
    '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
    '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="4">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '</cellXfs>' +
    '</styleSheet>',
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(dados: Buffer): number {
  let crc = 0xffffffff
  for (const byte of dados) crc = TABELA_CRC[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** ZIP (metodo deflate) com os arquivos na ordem dada. */
function gerarZip(arquivos: Array<[string, string]>): Buffer {
  const locais: Buffer[] = []
  const centrais: Buffer[] = []
  let deslocamento = 0

  for (const [nome, conteudo] of arquivos) {
    const nomeBytes = Buffer.from(nome, 'utf8')
    const dados = Buffer.from(conteudo, 'utf8')
    const comprimido = deflateRawSync(dados)
    const crc = crc32(dados)

    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6) // nomes em UTF-8
    local.writeUInt16LE(8, 8) // deflate
    local.writeUInt16LE(0, 10)
    local.writeUInt16LE(0x21, 12) // 01/01/1980
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(comprimido.length, 18)
    local.writeUInt32LE(dados.length, 22)
    local.writeUInt16LE(nomeBytes.length, 26)
    local.writeUInt16LE(0, 28)

    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0x0800, 8)
    central.writeUInt16LE(8, 10)
    central.writeUInt16LE(0, 12)
    central.writeUInt16LE(0x21, 14)
    central.writeUInt32LE(crc, 16)
    central.writeUInt32LE(comprimido.length, 20)
    central.writeUInt32LE(dados.length, 24)
    central.writeUInt16LE(nomeBytes.length, 28)
    central.writeUInt32LE(deslocamento, 42)

    locais.push(local, nomeBytes, comprimido)
    centrais.push(central, nomeBytes)
    deslocamento += local.length + nomeBytes.length + comprimido.length
  }

  const diretorio = Buffer.concat(centrais)
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(arquivos.length, 8)
  fim.writeUInt16LE(arquivos.length, 10)
  fim.writeUInt32LE(diretorio.length, 12)
  fim.writeUInt32LE(deslocamento, 16)

  return Buffer.concat([...locais, diretorio, fim])
}

export function gerarXlsx<T>(linhas: T[], colunas: Array<Coluna<T>>): Buffer {
  const ultima = letraColuna(Math.max(colunas.length - 1, 0))
  const workbook = PARTES_FIXAS['xl/workbook.xml'].replace('Dados!$A$1:$A$1', `Dados!$A$1:$${ultima}$${linhas.length + 1}`)
  return gerarZip([
    ['[Content_Types].xml', PARTES_FIXAS['[Content_Types].xml']],
    ['_rels/.rels', PARTES_FIXAS['_rels/.rels']],
    ['xl/workbook.xml', workbook],
    ['xl/_rels/workbook.xml.rels', PARTES_FIXAS['xl/_rels/workbook.xml.rels']],
    ['xl/styles.xml', PARTES_FIXAS['xl/styles.xml']],
    ['xl/worksheets/sheet1.xml', planilhaXml(linhas, colunas)],
  ])
}
