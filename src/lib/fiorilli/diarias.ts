/**
 * Ingestao das diarias pagas (Fiorilli, listagem Diarias). Ao contrario de DespesasGerais, esta
 * listagem respeita o periodo pedido; a consulta do exercicio inteiro e completa, entao a carga
 * remove o que sumiu do exercicio. O CPF do favorecido ja vem mascarado pela API.
 */

import type { Prisma } from '@prisma/client'
import { buscarListagem, periodoDoExercicio, type FiorilliRegistro, type OpcoesChamada } from './client'
import { limparTexto, parseData, parseDocumento, parseMoney, textoCurto } from './parse'
import { gravarEscopo, type Linha } from './persistencia'
import type { ResultadoModulo } from './tipos'

type DadosDiaria = Omit<Prisma.DiariaUncheckedCreateInput, 'fonte' | 'idExternalRef'>

/** Um pagamento de diaria = empenho (PKEMP) + ordem de pagamento. */
export function chaveDiaria(registro: FiorilliRegistro, exercicio: number): string | null {
  const empresa = limparTexto(registro.EMPRESA)
  const pkemp = limparTexto(registro.PKEMP)
  const ordem = limparTexto(registro.ORDEMPAGAMENTO)
  if (!empresa || !pkemp || !ordem) return null
  return `${empresa}-${exercicio}-${pkemp}-${ordem}`
}

export function mapearDiaria(registro: FiorilliRegistro, exercicio: number): Linha<DadosDiaria> | null {
  const idExternalRef = chaveDiaria(registro, exercicio)
  if (!idExternalRef) return null

  return {
    idExternalRef,
    dados: {
      payload: registro as Prisma.InputJsonObject,
      exercicio,
      data: parseData(registro.DATA),
      favorecido: textoCurto(registro.FAVORECIDO) ?? 'Não informado',
      cargo: textoCurto(registro.CARGO),
      cpf: parseDocumento(registro.CPFFORMATADO),
      orgaoCodigo: textoCurto(registro.CODORGAO),
      orgaoNome: textoCurto(registro.NOMEORGAO),
      unidadeNome: textoCurto(registro.NOMEUNIDADE),
      descricao: limparTexto(registro.DESCRICAO),
      elementoDespesa: textoCurto(registro.NOME_ELEMENTO),
      numeroEmpenho: textoCurto(registro.NEMPG),
      quantidade: parseMoney(registro.QUANT),
      valor: parseMoney(registro.VALOR) ?? 0,
      valorAnulado: parseMoney(registro.VALORANULADO),
    },
  }
}

export async function sincronizarDiarias(exercicio: number, opcoes: OpcoesChamada = {}): Promise<ResultadoModulo> {
  const registros = await buscarListagem('Despesas', 'Diarias', {
    ConectarExercicio: exercicio,
    ...periodoDoExercicio(exercicio),
    MostraDadosConsolidado: false,
  }, opcoes)

  const linhas: Array<Linha<DadosDiaria>> = []
  const vistas = new Set<string>()
  let erros = 0
  for (const registro of registros) {
    const linha = mapearDiaria(registro, exercicio)
    if (!linha || vistas.has(linha.idExternalRef)) {
      erros++
      continue
    }
    vistas.add(linha.idExternalRef)
    linhas.push(linha)
  }

  const gravacao = await gravarEscopo('diaria', { exercicio }, linhas)
  return {
    recebidos: registros.length,
    erros,
    divergencias: [],
    aviso: registros.length === 0 ? 'A API devolveu lista vazia; nada foi removido.' : undefined,
    ...gravacao,
  }
}
