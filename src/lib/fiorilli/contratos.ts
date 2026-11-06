/**
 * Ingestao dos contratos da Fiorilli.
 *
 * Comportamento da API, verificado contra o servidor de Tefe:
 * - Como nas licitacoes, a consulta de um ano traz contratos de anos anteriores ainda ativos;
 *   o ano vem do registro e a carga nao remove nada.
 * - EMPENHADO/LIQUIDADO sao so do exercicio consultado; os anos anteriores vem em EMPENHADOANT/
 *   LIQUIDADOANT. Em todos os contratos, valor atual = EMPENHADOANT + EMPENHADO + SALDOEMPENHAR.
 * - VIGENI costuma vir igual a VIGENF (122 de 166), entao o inicio da vigencia e a data de
 *   assinatura (DTASSI) e o fim e o vencimento atual, que ja considera aditivos de prazo.
 * - O processo licitatorio (PROCLIC, ex. "000182/25") e o mesmo numeroProcesso das licitacoes,
 *   o que permite ligar o contrato a licitacao. Por isso licitacoes sincronizam antes.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { buscarListagem, type FiorilliRegistro, type OpcoesChamada } from './client'
import { agoraEmManaus, limparTexto, parseAno, parseData, parseDocumento, parseMoney, textoCurto } from './parse'
import { FONTE_FIORILLI, gravarEscopo, type Linha } from './persistencia'
import type { ResultadoModulo } from './tipos'

type DadosContrato = Omit<Prisma.ContratoUncheckedCreateInput, 'fonte' | 'idExternalRef'>

/** Soma dos valores informados; null quando nenhum veio preenchido. */
function somaOpcional(...valores: Array<string | null | undefined>): number | null {
  const numeros = valores.map(parseMoney).filter((n): n is number => n !== null)
  return numeros.length > 0 ? numeros.reduce((t, n) => t + n, 0) : null
}

export function chaveContrato(registro: FiorilliRegistro): string | null {
  const empresa = limparTexto(registro.EMPRESA)
  const ano = parseAno(registro.ANO)
  const codigo = limparTexto(registro.CODIGO)
  if (!empresa || !ano || !codigo) return null
  return `${empresa}-${ano}-${codigo}`
}

/** vigente, encerrado (vencimento antes de hoje, em Manaus) ou anulado. */
export function statusContrato(fim: Date | null, anulacao: Date | null, agora = new Date()): string {
  if (anulacao) return 'anulado'
  if (!fim) return 'vigente'
  const hoje = agoraEmManaus(agora).toISOString().slice(0, 10)
  const vencimento = agoraEmManaus(fim).toISOString().slice(0, 10)
  return vencimento < hoje ? 'encerrado' : 'vigente'
}

export function mapearContrato(
  registro: FiorilliRegistro,
  licitacoesPorProcesso: Map<string, string> = new Map(),
  agora = new Date()
): Linha<DadosContrato> | null {
  const idExternalRef = chaveContrato(registro)
  const ano = parseAno(registro.ANO)
  const inicio = parseData(registro.DTASSI) ?? parseData(registro.VIGENI)
  if (!idExternalRef || !ano || !inicio) return null

  const fim = parseData(registro.VENCIMENTO_ATUAL) ?? parseData(registro.VIGENF)
  const valorInicial = parseMoney(registro.VALCON) ?? 0
  const valorAditado = parseMoney(registro.ADITADO)
  const processo = textoCurto(registro.PROCLIC)

  return {
    idExternalRef,
    dados: {
      payload: registro as Prisma.InputJsonObject,
      numero: textoCurto(registro.CONTRATONUM) ?? limparTexto(registro.CODIGO)!,
      ano,
      tipoContrato: textoCurto(registro.TIPOCO),
      modalidade: textoCurto(registro.MODALI),
      objeto: limparTexto(registro.OBJETO_COMPLETO) ?? limparTexto(registro.OBJETO) ?? 'Objeto não informado',
      objetoResumido: limparTexto(registro.OBJETO),
      status: statusContrato(fim, parseData(registro.DTANULA), agora),
      dataAssinatura: parseData(registro.DTASSI),
      dataPublicacao: parseData(registro.DTPUBL),
      dataInicioVigencia: inicio,
      dataFimVigencia: fim,
      valorInicial,
      valorAtual: valorInicial + (valorAditado ?? 0),
      valorAditado,
      valorEmpenhado: somaOpcional(registro.EMPENHADOANT, registro.EMPENHADO),
      valorLiquidado: somaOpcional(registro.LIQUIDADOANT, registro.LIQUIDADO),
      contratadoNome: textoCurto(registro.FORNECEDOR) ?? 'Contratado não informado',
      contratadoCnpj: parseDocumento(registro.INSMF) ?? '',
      orgaoNome: textoCurto(registro.ENTIDADE),
      licitacaoNumero: processo,
      licitacaoId: processo ? licitacoesPorProcesso.get(processo) ?? null : null,
      gestorNome: textoCurto(registro.RESPON),
    },
  }
}

async function licitacoesPorProcesso(processos: string[]): Promise<Map<string, string>> {
  const encontradas = await prisma.licitacao.findMany({
    where: { fonte: FONTE_FIORILLI, numeroProcesso: { in: processos } },
    select: { id: true, numeroProcesso: true },
  })
  const mapa = new Map<string, string>()
  for (const { id, numeroProcesso } of encontradas) {
    if (numeroProcesso && !mapa.has(numeroProcesso)) mapa.set(numeroProcesso, id)
  }
  return mapa
}

export async function sincronizarContratos(exercicio: number, opcoes: OpcoesChamada = {}): Promise<ResultadoModulo> {
  const registros = await buscarListagem('LicitacoesEContratos', 'Contratos', {
    ConectarExercicio: exercicio,
    Ano: exercicio,
    MostraDadosConsolidado: false,
    ContratosApenasPublicados: false,
  }, opcoes)

  const processos = [...new Set(registros.map((r) => textoCurto(r.PROCLIC)).filter((p): p is string => Boolean(p)))]
  const licitacoes = await licitacoesPorProcesso(processos)

  const linhas: Array<Linha<DadosContrato>> = []
  const vistas = new Set<string>()
  let erros = 0
  for (const registro of registros) {
    const linha = mapearContrato(registro, licitacoes)
    if (!linha || vistas.has(linha.idExternalRef)) {
      erros++
      continue
    }
    vistas.add(linha.idExternalRef)
    linhas.push(linha)
  }

  const gravacao = await gravarEscopo('contrato', {}, linhas, { remover: false })
  return { recebidos: registros.length, erros, divergencias: [], ...gravacao }
}
