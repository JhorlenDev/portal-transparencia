/**
 * Ingestao das transferencias entre entidades do municipio (Fiorilli, listagem Transf): repasses
 * entre a Prefeitura e os fundos/autarquias. A listagem nao tem parametro de periodo; cada
 * exercicio vem completo, entao a carga remove o que sumiu do exercicio.
 *
 * Emendas impositivas (EmendasImpositivasArt166A e CadEmendasImpositivas) ficaram de fora: em
 * Tefe a primeira devolve so dois totalizadores zerados e a segunda vem vazia.
 */

import type { Prisma } from '@prisma/client'
import { buscarListagem, type FiorilliRegistro, type OpcoesChamada } from './client'
import { limparTexto, parseData, parseDocumento, parseInteiro, parseMoney, textoCurto } from './parse'
import { gravarEscopo, type Linha } from './persistencia'
import type { ResultadoModulo } from './tipos'

type DadosTransferencia = Omit<Prisma.TransferenciaUncheckedCreateInput, 'fonte' | 'idExternalRef'>

/**
 * A API nao tem identificador do lancamento: a chave e data + entidades + valores. Lancamentos
 * identicos no mesmo dia sao diferenciados pela ordem de ocorrencia.
 */
export function chavesTransferencias(registros: FiorilliRegistro[], exercicio: number): string[] {
  const ocorrencias = new Map<string, number>()
  return registros.map((r) => {
    const base = [exercicio, r.DTLAN, r.CNPJPAGADORA, r.CNPJRECEBEDORA, r.REPASSE, r.DEVOLUCAO]
      .map((v) => limparTexto(v) ?? '')
      .join('|')
    const n = (ocorrencias.get(base) ?? 0) + 1
    ocorrencias.set(base, n)
    return `${base}#${n}`
  })
}

export function mapearTransferencia(
  registro: FiorilliRegistro,
  exercicio: number,
  idExternalRef: string
): Linha<DadosTransferencia> {
  return {
    idExternalRef,
    dados: {
      payload: registro as Prisma.InputJsonObject,
      exercicio,
      mes: parseInteiro(registro.MES),
      data: parseData(registro.DTLAN),
      entidadePagadora: textoCurto(registro.ENTIDADE_PAGADORA) ?? 'Não informada',
      cnpjPagadora: parseDocumento(registro.CNPJPAGADORA),
      entidadeRecebedora: textoCurto(registro.ENTIDADE_RECEBEDORA) ?? 'Não informada',
      cnpjRecebedora: parseDocumento(registro.CNPJRECEBEDORA),
      valorRepasse: parseMoney(registro.REPASSE) ?? 0,
      valorDevolucao: parseMoney(registro.DEVOLUCAO),
      valorPrevisto: parseMoney(registro.PREVISTO),
    },
  }
}

export async function sincronizarTransferencias(exercicio: number, opcoes: OpcoesChamada = {}): Promise<ResultadoModulo> {
  const registros = await buscarListagem('Transferencias', 'Transf', {
    ConectarExercicio: exercicio,
    MostraDadosConsolidado: false,
  }, opcoes)

  const chaves = chavesTransferencias(registros, exercicio)
  const linhas = registros.map((registro, i) => mapearTransferencia(registro, exercicio, chaves[i]))
  const gravacao = await gravarEscopo('transferencia', { exercicio }, linhas)

  return {
    recebidos: registros.length,
    erros: 0,
    divergencias: [],
    aviso: registros.length === 0 ? 'A API devolveu lista vazia; nada foi removido.' : undefined,
    ...gravacao,
  }
}
