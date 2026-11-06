/**
 * Normalizadores dos dados da API Fiorilli SCPI. A API devolve tudo como texto:
 * valores no formato brasileiro ("4742094,37"), datas "DD/MM/YYYY HH:mm:ss" ou
 * "DD.MM.YYYY", booleanos "True"/"S", anos com 2 digitos ("25") e, em alguns
 * campos, frases da interface original no lugar do dado.
 */

/** Tefe usa o horario de Manaus, que nao tem horario de verao (UTC-4 fixo). */
const OFFSET_MANAUS = '-04:00'
const OFFSET_MANAUS_MS = -4 * 60 * 60 * 1000

/** Data/hora de parede em Manaus, nos campos UTC do Date (use getUTC*). */
export function agoraEmManaus(agora = new Date()): Date {
  return new Date(agora.getTime() + OFFSET_MANAUS_MS)
}

export function anoAtualManaus(agora = new Date()): number {
  return agoraEmManaus(agora).getUTCFullYear()
}

export type Bruto = string | number | boolean | null | undefined

/** Texto sem espacos sobrando; vazio vira null. A API completa campos com espacos ("Encerrada   "). */
export function limparTexto(valor: Bruto): string | null {
  if (valor === null || valor === undefined) return null
  const texto = String(valor).replace(/\s+/g, ' ').trim()
  return texto || null
}

/** Texto limpo e cortado no tamanho da coluna (VARCHAR(191) por padrao), para um nome longo nao derrubar a carga. */
export function textoCurto(valor: Bruto, tamanho = 191): string | null {
  return limparTexto(valor)?.slice(0, tamanho) ?? null
}

/**
 * Converte "8.000.390,31", "8000390,31", "-1937,96" ou "1530000" em numero.
 * Sem virgula, os pontos sao tratados como separador de milhar, que e o formato da API.
 */
export function parseMoney(valor: Bruto): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  const texto = limparTexto(valor)
  if (!texto) return null

  const normalizado = texto.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normalizado)) return null

  const numero = Number.parseFloat(normalizado)
  return Number.isFinite(numero) ? numero : null
}

/** Inteiro simples ("000182" -> 182). */
export function parseInteiro(valor: Bruto): number | null {
  if (typeof valor === 'number') return Number.isInteger(valor) ? valor : null
  const texto = limparTexto(valor)
  if (!texto || !/^-?\d+$/.test(texto)) return null
  return Number.parseInt(texto, 10)
}

/** Ano com 4 ou 2 digitos ("25" -> 2025). */
export function parseAno(valor: Bruto): number | null {
  const ano = parseInteiro(valor)
  if (ano === null || ano < 0) return null
  if (ano < 100) return 2000 + ano
  return ano >= 1900 && ano <= 2999 ? ano : null
}

/**
 * Aceita "DD/MM/YYYY", "DD/MM/YYYY HH:mm:ss", "DD.MM.YYYY" e "YYYY-MM-DD".
 * A hora e interpretada no fuso de Manaus, para a data nao "voltar um dia" na tela.
 */
export function parseData(valor: Bruto): Date | null {
  const texto = limparTexto(valor)
  if (!texto) return null

  let dia: number, mes: number, ano: number
  let hora = 0, minuto = 0, segundo = 0

  const br = texto.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)

  if (br) {
    dia = Number(br[1])
    mes = Number(br[2])
    ano = br[3].length === 2 ? 2000 + Number(br[3]) : Number(br[3])
    hora = Number(br[4] ?? 0)
    minuto = Number(br[5] ?? 0)
    segundo = Number(br[6] ?? 0)
  } else if (iso) {
    ano = Number(iso[1])
    mes = Number(iso[2])
    dia = Number(iso[3])
    hora = Number(iso[4] ?? 0)
    minuto = Number(iso[5] ?? 0)
    segundo = Number(iso[6] ?? 0)
  } else {
    return null
  }

  if (ano < 1900 || mes < 1 || mes > 12 || dia < 1 || hora > 23 || minuto > 59 || segundo > 59) return null
  // Rejeita 31/02 e afins, que o Date "corrigiria" para marco.
  if (dia > new Date(Date.UTC(ano, mes, 0)).getUTCDate()) return null

  const p = (n: number, t = 2) => String(n).padStart(t, '0')
  const data = new Date(`${p(ano, 4)}-${p(mes)}-${p(dia)}T${p(hora)}:${p(minuto)}:${p(segundo)}${OFFSET_MANAUS}`)
  return Number.isNaN(data.getTime()) ? null : data
}

/** "True"/"S"/"Sim"/"1" -> true, "False"/"N"/"Nao"/"0" -> false, resto -> null. */
export function parseBool(valor: Bruto): boolean | null {
  if (typeof valor === 'boolean') return valor
  const texto = limparTexto(valor)?.toLowerCase()
  if (!texto) return null
  if (['true', 's', 'sim', '1'].includes(texto)) return true
  if (['false', 'n', 'nao', 'não', '0'].includes(texto)) return false
  return null
}

// Os digitos do CPF podem vir mascarados pela propria API (LGPD): "080.XXX.XXX-66".
const CPF = /^[\dX*]{3}\.[\dX*]{3}\.[\dX*]{3}-[\dX*]{2}$|^[\dX*]{11}$/i
const CNPJ = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/

/**
 * Devolve o CPF/CNPJ como veio, se tiver formato valido; qualquer outra coisa vira null.
 * Barra textos de interface como "Para consultar clique duas vezes na linha deste registro".
 */
export function parseDocumento(valor: Bruto): string | null {
  const texto = limparTexto(valor)
  if (!texto) return null
  return CPF.test(texto) || CNPJ.test(texto) ? texto : null
}
