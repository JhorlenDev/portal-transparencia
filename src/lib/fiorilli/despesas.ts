/**
 * Ingestao das despesas (empenhos) da Fiorilli.
 *
 * Comportamento da API, verificado contra o servidor de Tefe:
 * - DespesasGerais devolve todos os empenhos emitidos de 01/01 ate o fim do periodo; o dia
 *   inicial e ignorado. Por isso cada sincronizacao busca o exercicio inteiro de uma vez
 *   (2024: ~5 mil empenhos, ~10 MB, ~40 s).
 * - EMPENHADO/LIQUIDADO/PAGO sao os valores atuais do empenho, qualquer que seja o periodo;
 *   os campos *_ATE_A_DATA sao acumulados ate o fim do periodo.
 * - As anulacoes (TPEM "AN") sao linhas proprias com valor negativo. Com elas, a soma por
 *   orgao bate exatamente com DespesasPorOrgao, o que e usado como conferencia a cada carga.
 */

import type { Prisma } from '@prisma/client'
import { buscarListagem, periodoDoExercicio, type FiorilliRegistro, type OpcoesChamada } from './client'
import { limparTexto, parseData, parseDocumento, parseMoney, textoCurto as curto } from './parse'
import { gravarEscopo, type Linha } from './persistencia'
import type { ResultadoModulo } from './tipos'

/** O exercicio inteiro passa de 30 s; o timeout padrao derrubaria toda carga. */
const TIMEOUT_EXERCICIO_MS = 180_000

/** Diferenca aceita na conferencia com DespesasPorOrgao (arredondamento de centavos). */
const TOLERANCIA = 0.01

/** TPEM das anulacoes; os demais sao OR (ordinario), ES (estimativo) e GL (global). */
const TIPO_ANULACAO = 'AN'

type DadosDespesa = Omit<Prisma.DespesaUncheckedCreateInput, 'fonte' | 'idExternalRef'>

/** Codigo do orgao = 4 primeiros digitos da unidade (CODLO "020201" -> orgao "0202"). */
export function codigoOrgao(codigoUnidade: string | null | undefined): string | null {
  const codigo = limparTexto(codigoUnidade)
  return codigo && codigo.length >= 4 ? codigo.slice(0, 4) : null
}

/**
 * PKEMP e a chave do lancamento no SCPI. (EMPRESA, CODIGO, TPEM) nao serve: as anulacoes
 * (TPEM "AN") repetem o mesmo CODIGO a cada anulacao parcial.
 */
export function chaveEmpenho(registro: FiorilliRegistro, exercicio: number): string | null {
  const empresa = limparTexto(registro.EMPRESA)
  const pkemp = limparTexto(registro.PKEMP)
  if (!empresa || !pkemp) return null
  return `${empresa}-${exercicio}-${pkemp}`
}

/** Converte um registro de DespesasGerais; null se faltar a chave do empenho. */
export function mapearEmpenho(
  registro: FiorilliRegistro,
  exercicio: number,
  orgaos: Map<string, string>
): Linha<DadosDespesa> | null {
  const idExternalRef = chaveEmpenho(registro, exercicio)
  if (!idExternalRef) return null

  const codigoUnidade = limparTexto(registro.CODLO)
  const historico = limparTexto(registro.PRODU)
  const tipoEmpenho = limparTexto(registro.TPEM)

  return {
    idExternalRef,
    dados: {
      payload: registro as Prisma.InputJsonObject,
      exercicio,
      numeroEmpenho: limparTexto(registro.CODIGO) ?? limparTexto(registro.PKEMP)!,
      // Anulacoes vem como lancamentos proprios, com valores negativos.
      tipoMovimento: tipoEmpenho === TIPO_ANULACAO ? 'Anulação' : 'Empenho',
      tipoEmpenho,
      dataEmpenho: parseData(registro.DATAE),
      credorNome: curto(registro.NOMEFOR),
      credorCpfCnpj: parseDocumento(registro.CPFFORMATADO),
      objeto: historico,
      historico,
      orgaoNome: curto(orgaos.get(codigoOrgao(codigoUnidade) ?? '')),
      unidadeCodigo: curto(codigoUnidade),
      unidadeNome: curto(registro.NOMELOCAL),
      elementoDespesa: curto(registro.CATEC),
      elementoDespesaNome: curto(registro.NATUREZA),
      funcao: curto(registro.FUNCAONOME),
      subfuncao: curto(registro.SUBFUNCAONOME),
      programa: curto(registro.PROGRAMANOME),
      acao: curto(registro.PROJETO_ATIVIDADE_NOME),
      fonteRecurso: curto(registro.FONTE_STN),
      fonteRecursoNome: curto(registro.FONTE_STNDESC),
      modalidadeLicitacao: curto(registro.LICIT),
      numeroLicitacao: curto(registro.NUMLICIT),
      valorEmpenhado: parseMoney(registro.EMPENHADO) ?? 0,
      valorLiquidado: parseMoney(registro.LIQUIDADO) ?? 0,
      valorPago: parseMoney(registro.PAGO) ?? 0,
      valorAnulado: parseMoney(registro.ANULADO),
    },
  }
}

/**
 * Compara as somas por orgao dos empenhos com os totais oficiais de DespesasPorOrgao.
 * Devolve uma descricao por diferenca encontrada (lista vazia = consistente).
 */
export function conferirComTotaisPorOrgao(
  linhas: Array<Linha<DadosDespesa>>,
  totaisOficiais: FiorilliRegistro[]
): string[] {
  const somas = new Map<string, { empenhado: number; liquidado: number; pago: number }>()
  for (const { dados } of linhas) {
    const orgao = codigoOrgao(dados.unidadeCodigo) ?? '?'
    const soma = somas.get(orgao) ?? { empenhado: 0, liquidado: 0, pago: 0 }
    soma.empenhado += dados.valorEmpenhado ?? 0
    soma.liquidado += dados.valorLiquidado ?? 0
    soma.pago += dados.valorPago ?? 0
    somas.set(orgao, soma)
  }

  const divergencias: string[] = []
  const vistos = new Set<string>()

  for (const oficial of totaisOficiais) {
    const orgao = limparTexto(oficial.CODIGO) ?? '?'
    vistos.add(orgao)
    const soma = somas.get(orgao) ?? { empenhado: 0, liquidado: 0, pago: 0 }
    const campos = [
      ['empenhado', parseMoney(oficial.EMPENHADO) ?? 0, soma.empenhado],
      ['liquidado', parseMoney(oficial.LIQUIDADO) ?? 0, soma.liquidado],
      ['pago', parseMoney(oficial.PAGO) ?? 0, soma.pago],
    ] as const
    for (const [campo, esperado, obtido] of campos) {
      if (Math.abs(esperado - obtido) > TOLERANCIA) {
        divergencias.push(`orgao ${orgao} ${campo}: oficial ${esperado.toFixed(2)}, empenhos ${obtido.toFixed(2)}`)
      }
    }
  }

  for (const [orgao, soma] of somas) {
    if (!vistos.has(orgao) && (soma.empenhado || soma.liquidado || soma.pago)) {
      divergencias.push(`orgao ${orgao} tem empenhos mas nao aparece em DespesasPorOrgao`)
    }
  }

  return divergencias
}

export async function sincronizarDespesas(exercicio: number, opcoes: OpcoesChamada = {}): Promise<ResultadoModulo> {
  const params = { ConectarExercicio: exercicio, ...periodoDoExercicio(exercicio), MostraDadosConsolidado: false }

  const totaisPorOrgao = await buscarListagem('Despesas', 'DespesasPorOrgao', params, opcoes)
  const registros = await buscarListagem('Despesas', 'DespesasGerais', {
    ...params,
    MostrarFornecedor: true,
    MostrarCNPJFornecedor: true,
    UFParaFiltroCOVID: '',
    ApenasIDEmpenho: false,
  }, {
    ...opcoes,
    config: { ...opcoes.config, timeoutMs: Math.max(opcoes.config?.timeoutMs ?? 0, TIMEOUT_EXERCICIO_MS) },
  })

  const orgaos = new Map<string, string>()
  for (const orgao of totaisPorOrgao) {
    const codigo = limparTexto(orgao.CODIGO)
    const nome = limparTexto(orgao.DESCRICAO)
    if (codigo && nome) orgaos.set(codigo, nome)
  }

  const linhas: Array<Linha<DadosDespesa>> = []
  const vistas = new Set<string>()
  let erros = 0
  for (const registro of registros) {
    const linha = mapearEmpenho(registro, exercicio, orgaos)
    if (!linha || vistas.has(linha.idExternalRef)) {
      erros++
      continue
    }
    vistas.add(linha.idExternalRef)
    linhas.push(linha)
  }

  const divergencias = conferirComTotaisPorOrgao(linhas, totaisPorOrgao)
  const gravacao = await gravarEscopo('despesa', { exercicio }, linhas)

  return {
    recebidos: registros.length,
    erros,
    divergencias,
    aviso: registros.length === 0 ? 'A API devolveu lista vazia; nada foi removido.' : undefined,
    ...gravacao,
  }
}
