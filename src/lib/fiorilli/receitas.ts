/**
 * Ingestao das receitas da Fiorilli (orcamentaria, transferencias da Uniao e do Estado).
 *
 * Comportamento da API, verificado contra o servidor de Tefe:
 * - A receita vem em arvore: a coluna ORDEM e o nivel (1, 2, 3, 4, 7 sao totalizadores e 10 e a
 *   linha analitica). A soma das analiticas bate com a dos totalizadores de nivel 1.
 * - ReceitaUniao/ReceitaEstado repetem as transferencias que ja estao na orcamentaria.
 *   Tudo e gravado (com tipoReceita e nivel), e as consultas do portal somam so as
 *   analiticas da orcamentaria (ver RECEITAS_SEM_DUPLICIDADE em site-data).
 * - `CodigoReceita=` vazio faz ReceitaOrcamentaria devolver []; o parametro e omitido.
 * - A API ignora o exercicio pedido nas receitas e sempre responde com o exercicio corrente.
 *   Para nao gravar os numeros do ano atual como se fossem de outro ano, a carga de um
 *   exercicio anterior e ignorada quando a resposta e identica a do exercicio corrente.
 */

import type { Prisma } from '@prisma/client'
import { buscarListagem, periodoDoExercicio, type FiorilliRegistro, type OpcoesChamada } from './client'
import { anoAtualManaus, limparTexto, parseInteiro, parseMoney } from './parse'
import { gravarEscopo, type Linha } from './persistencia'
import type { ResultadoModulo } from './tipos'

export type TipoReceita = 'orcamentaria' | 'uniao' | 'estado'

export const LISTAGENS_RECEITA: ReadonlyArray<[TipoReceita, string]> = [
  ['orcamentaria', 'ReceitaOrcamentaria'],
  ['uniao', 'ReceitaUniao'],
  ['estado', 'ReceitaEstado'],
]

export const NIVEL_ANALITICO = 10

const TOLERANCIA = 0.01

/** Categoria economica pelo primeiro digito da natureza da receita. */
const CATEGORIAS: Record<string, string> = {
  '1': 'Receitas Correntes',
  '2': 'Receitas de Capital',
  '7': 'Receitas Correntes Intraorçamentárias',
  '8': 'Receitas de Capital Intraorçamentárias',
  '9': 'Deduções da Receita',
}

type DadosReceita = Omit<Prisma.ReceitaUncheckedCreateInput, 'fonte' | 'idExternalRef'>

export function categoriaEconomica(codigo: string): string {
  return CATEGORIAS[codigo.charAt(0)] ?? 'Outras Receitas'
}

/** Converte uma linha de receita; null se faltar o codigo ou o nivel. */
export function mapearReceita(
  registro: FiorilliRegistro,
  tipo: TipoReceita,
  exercicio: number
): Linha<DadosReceita> | null {
  const codigo = limparTexto(registro.CODIGO)
  const nivel = parseInteiro(registro.ORDEM)
  if (!codigo || nivel === null) return null

  const empresa = limparTexto(registro.EMPRESA) ?? ''
  const fonteRecurso = limparTexto(registro.FONTE)
  const vinculo = limparTexto(registro.VINCODIGO) ?? ''

  return {
    // Um mesmo codigo aparece em mais de um nivel (ex.: 9510.00.0.0.00 nos niveis 3 e 7).
    idExternalRef: [tipo, exercicio, empresa, codigo, fonteRecurso ?? '', vinculo, nivel].join('|'),
    dados: {
      payload: registro as Prisma.InputJsonObject,
      exercicio,
      tipoReceita: tipo,
      nivel,
      codigoNatureza: codigo,
      naturezaReceita: (limparTexto(registro.NOME) ?? codigo).slice(0, 191),
      categoriaEconomica: categoriaEconomica(codigo),
      fonteRecurso: fonteRecurso?.slice(0, 191) ?? null,
      valorPrevisto: parseMoney(registro.PREVISAO_INICIAL) ?? 0,
      valorPrevistoAtualizado: parseMoney(registro.PREVISAO_ATUALIZADA),
      valorArrecadado: parseMoney(registro.ARRECADADO_TOTAL) ?? 0,
      valorArrecadadoPeriodo: parseMoney(registro.ARRECADADO_PERIODO),
    },
  }
}

/** Confere se as linhas analiticas somam o mesmo que os totalizadores de nivel 1. */
export function conferirArvore(registros: FiorilliRegistro[]): string[] {
  const nivel = (r: FiorilliRegistro) => parseInteiro(r.ORDEM)
  const raizes = registros.filter((r) => nivel(r) === 1)
  const analiticas = registros.filter((r) => nivel(r) === NIVEL_ANALITICO)
  if (raizes.length === 0 || analiticas.length === 0) return []

  const divergencias: string[] = []
  for (const campo of ['PREVISAO_INICIAL', 'ARRECADADO_TOTAL']) {
    const soma = (lista: FiorilliRegistro[]) => lista.reduce((t, r) => t + (parseMoney(r[campo]) ?? 0), 0)
    const total = soma(raizes)
    const detalhe = soma(analiticas)
    if (Math.abs(total - detalhe) > TOLERANCIA) {
      divergencias.push(`${campo}: totalizadores ${total.toFixed(2)}, linhas analiticas ${detalhe.toFixed(2)}`)
    }
  }
  return divergencias
}

function assinatura(registros: FiorilliRegistro[]): string {
  const previsto = registros.reduce((t, r) => t + (parseMoney(r.PREVISAO_INICIAL) ?? 0), 0)
  return `${registros.length}:${previsto.toFixed(2)}`
}

async function buscarReceitas(exercicio: number, opcoes: OpcoesChamada) {
  const params = { ConectarExercicio: exercicio, ...periodoDoExercicio(exercicio), MostraDadosConsolidado: false }
  const respostas = new Map<TipoReceita, FiorilliRegistro[]>()
  for (const [tipo, listagem] of LISTAGENS_RECEITA) {
    respostas.set(tipo, await buscarListagem('Receitas', listagem, params, opcoes))
  }
  return respostas
}

export async function sincronizarReceitas(
  exercicio: number,
  opcoes: OpcoesChamada = {},
  anoCorrente = anoAtualManaus()
): Promise<ResultadoModulo> {
  // Busca as tres listagens antes de gravar: ou o exercicio inteiro e atualizado, ou nada.
  const respostas = await buscarReceitas(exercicio, opcoes)
  const orcamentaria = respostas.get('orcamentaria') ?? []
  const recebidos = [...respostas.values()].reduce((t, lista) => t + lista.length, 0)
  const vazio = { recebidos, inseridos: 0, atualizados: 0, removidos: 0, erros: 0, divergencias: [] }

  // Sem a orcamentaria, gravar so Uniao/Estado removeria as linhas orcamentarias do exercicio.
  if (orcamentaria.length === 0) {
    return { ...vazio, aviso: 'ReceitaOrcamentaria devolveu lista vazia; nada foi gravado.' }
  }

  if (exercicio < anoCorrente) {
    const atual = await buscarListagem('Receitas', 'ReceitaOrcamentaria', {
      ConectarExercicio: anoCorrente,
      ...periodoDoExercicio(anoCorrente),
      MostraDadosConsolidado: false,
    }, opcoes)
    if (assinatura(atual) === assinatura(orcamentaria)) {
      return {
        ...vazio,
        ignorado: `A API devolveu para ${exercicio} a mesma receita de ${anoCorrente}; o historico de receitas nao esta disponivel por ela.`,
      }
    }
  }

  const linhas: Array<Linha<DadosReceita>> = []
  const vistas = new Set<string>()
  let erros = 0
  for (const [tipo, registros] of respostas) {
    for (const registro of registros) {
      const linha = mapearReceita(registro, tipo, exercicio)
      if (!linha || vistas.has(linha.idExternalRef)) {
        erros++
        continue
      }
      vistas.add(linha.idExternalRef)
      linhas.push(linha)
    }
  }

  const divergencias = conferirArvore(orcamentaria)
  const gravacao = await gravarEscopo('receita', { exercicio }, linhas)

  return { recebidos, erros, divergencias, ...gravacao }
}
