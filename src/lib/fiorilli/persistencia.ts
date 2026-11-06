/**
 * Gravacao idempotente dos registros da Fiorilli. Cada sincronizacao entrega a lista completa
 * de um escopo (ex.: despesas de um exercicio): o que veio e inserido/atualizado pela chave
 * (fonte, idExternalRef) e o que sumiu do escopo e removido. So toca em registros fonte = "fiorilli".
 * Licitacoes e contratos nao tem escopo completo (a consulta de um ano mistura processos de
 * varios anos e nao traz todos os do proprio ano), entao gravam sem remover.
 */

import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export const FONTE_FIORILLI = 'fiorilli'

/** Upserts por transacao. */
const TAMANHO_LOTE = 200

export interface Linha<T> {
  idExternalRef: string
  dados: T
}

export interface ResultadoGravacao {
  inseridos: number
  atualizados: number
  removidos: number
}

interface DelegateFiorilli {
  findMany(args: {
    where: Record<string, unknown>
    select: { idExternalRef: true }
  }): Promise<Array<{ idExternalRef: string | null }>>
  upsert(args: {
    where: { fonte_idExternalRef: { fonte: string; idExternalRef: string } }
    create: Record<string, unknown>
    update: Record<string, unknown>
  }): Prisma.PrismaPromise<unknown>
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>
}

type ModeloFiorilli = 'despesa' | 'receita' | 'licitacao' | 'contrato' | 'diaria' | 'transferencia'

function delegate(modelo: ModeloFiorilli): DelegateFiorilli {
  return prisma[modelo] as unknown as DelegateFiorilli
}

/**
 * Grava `linhas` como o conteudo completo de `escopo` (filtro extra, ex.: { exercicio: 2025 }).
 * Lista vazia nao remove nada: a API as vezes responde [] quando oscila, e isso nao pode
 * apagar o exercicio inteiro. Com `remover: false`, so insere e atualiza.
 */
export async function gravarEscopo<T extends object>(
  modelo: ModeloFiorilli,
  escopo: Record<string, unknown>,
  linhas: Array<Linha<T>>,
  { remover = true }: { remover?: boolean } = {}
): Promise<ResultadoGravacao> {
  const tabela = delegate(modelo)
  const where = { ...escopo, fonte: FONTE_FIORILLI }

  const existentes = new Set(
    (await tabela.findMany({ where, select: { idExternalRef: true } }))
      .map((r) => r.idExternalRef)
      .filter((ref): ref is string => Boolean(ref))
  )

  let inseridos = 0
  let atualizados = 0

  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE)
    await prisma.$transaction(
      lote.map(({ idExternalRef, dados }) =>
        tabela.upsert({
          where: { fonte_idExternalRef: { fonte: FONTE_FIORILLI, idExternalRef } },
          create: { ...(dados as Record<string, unknown>), fonte: FONTE_FIORILLI, idExternalRef },
          update: { ...(dados as Record<string, unknown>) },
        })
      )
    )
    for (const { idExternalRef } of lote) {
      if (existentes.has(idExternalRef)) atualizados++
      else inseridos++
    }
  }

  let removidos = 0
  if (remover && linhas.length > 0) {
    const resultado = await tabela.deleteMany({
      where: { ...where, idExternalRef: { notIn: linhas.map((l) => l.idExternalRef) } },
    })
    removidos = resultado.count
  }

  return { inseridos, atualizados, removidos }
}
