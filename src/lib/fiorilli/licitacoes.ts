/**
 * Ingestao das licitacoes da Fiorilli.
 *
 * Comportamento da API, verificado contra o servidor de Tefe:
 * - A consulta de um ano devolve processos de varios anos (a de 2024 traz de 2017 a 2024) e nem
 *   sempre todos os do proprio ano (6 processos de 2024 so aparecem na consulta de 2025). Por isso
 *   o ano vem do registro (ANO, com 2 digitos) e a carga nao remove nada.
 * - Processos antigos vem so com numero e objeto (sem modalidade, data, valor nem situacao).
 * - EDITAL, PARTICIPANTES e CPFCNPJ trazem o texto "Para consultar clique duas vezes na linha
 *   deste registro" e ARQUIVO vem vazio: a API nao expoe editais nem anexos.
 */

import type { Prisma } from '@prisma/client'
import { buscarListagem, type FiorilliRegistro, type OpcoesChamada } from './client'
import { limparTexto, parseAno, parseBool, parseData, parseMoney, textoCurto } from './parse'
import { gravarEscopo, type Linha } from './persistencia'
import type { ResultadoModulo } from './tipos'

type DadosLicitacao = Omit<Prisma.LicitacaoUncheckedCreateInput, 'fonte' | 'idExternalRef'>

/** Situacao da API -> status usado pelas telas do portal. */
const STATUS: Record<string, string> = {
  'em andamento': 'em_andamento',
  homologada: 'homologado',
  encerrada: 'encerrado',
  classificada: 'classificado',
}

export function statusLicitacao(situacao: string | null | undefined): string {
  const texto = limparTexto(situacao)?.toLowerCase()
  if (!texto) return 'nao_informado'
  return STATUS[texto] ?? texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_')
}

export function chaveLicitacao(registro: FiorilliRegistro): string | null {
  const empresa = limparTexto(registro.EMPRESA)
  const ano = parseAno(registro.ANO)
  const numero = limparTexto(registro.NUMERO)
  if (!empresa || !ano || !numero) return null
  return `${empresa}-${ano}-${numero}-${limparTexto(registro.PROCLICITACAO) ?? ''}`
}

export function mapearLicitacao(registro: FiorilliRegistro): Linha<DadosLicitacao> | null {
  const idExternalRef = chaveLicitacao(registro)
  const ano = parseAno(registro.ANO)
  if (!idExternalRef || !ano) return null

  return {
    idExternalRef,
    dados: {
      payload: registro as Prisma.InputJsonObject,
      numero: limparTexto(registro.NUMERO)!,
      ano,
      modalidade: textoCurto(registro.LICIT) ?? 'Não informada',
      objeto: limparTexto(registro.DISCR) ?? 'Objeto não informado',
      objetoResumido: limparTexto(registro.DISCR10),
      status: statusLicitacao(registro.SITUACAO),
      dataAbertura: parseData(registro.DATAE),
      dataEncerramento: parseData(registro.DTENC),
      valorEstimado: parseMoney(registro.VALOR),
      numeroProcesso: textoCurto(registro.PROCLIC),
      orgaoNome: textoCurto(registro.NOMEEMPRESA),
      fundamentoLegal: textoCurto(registro.ARTIGO_INCISO),
      registroPreco: parseBool(registro.REGISTROPRECO),
    },
  }
}

export async function sincronizarLicitacoes(exercicio: number, opcoes: OpcoesChamada = {}): Promise<ResultadoModulo> {
  const registros = await buscarListagem('LicitacoesEContratos', 'Licitacoes', {
    ConectarExercicio: exercicio,
    Ano: exercicio,
    MostraDadosConsolidado: false,
  }, opcoes)

  const linhas: Array<Linha<DadosLicitacao>> = []
  const vistas = new Set<string>()
  let erros = 0
  for (const registro of registros) {
    const linha = mapearLicitacao(registro)
    if (!linha || vistas.has(linha.idExternalRef)) {
      erros++
      continue
    }
    vistas.add(linha.idExternalRef)
    linhas.push(linha)
  }

  const gravacao = await gravarEscopo('licitacao', {}, linhas, { remover: false })
  return { recebidos: registros.length, erros, divergencias: [], ...gravacao }
}
