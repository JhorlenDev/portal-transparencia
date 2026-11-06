import { NextResponse, type NextRequest } from 'next/server'
import { exigirAdmin } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { configuracaoAgendador } from '@/lib/fiorilli/agendador'
import { FONTE_FIORILLI } from '@/lib/fiorilli/persistencia'
import {
  MODULOS_FIORILLI,
  SincronizacaoEmAndamentoError,
  estadoSincronizacao,
  sincronizarFiorilli,
  type ModuloFiorilli,
} from '@/lib/fiorilli/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 3600

/**
 * Estado atual, configuracao do agendador, ultima carga de cada (modulo, exercicio) e o historico
 * recente.
 */
export async function GET() {
  const negado = await exigirAdmin()
  if (negado) return negado

  const logs = await prisma.sincronizacaoLog.findMany({
    where: { fonte: FONTE_FIORILLI },
    orderBy: { iniciadoEm: 'desc' },
    take: 50,
  })

  // Ultima carga finalizada de cada modulo/exercicio, em uma consulta agrupada.
  const ultimas = await prisma.sincronizacaoLog.groupBy({
    by: ['modulo', 'exercicio'],
    where: { fonte: FONTE_FIORILLI, status: { not: 'EXECUTANDO' } },
    _max: { iniciadoEm: true },
  })
  const resumo = await prisma.sincronizacaoLog.findMany({
    where: {
      fonte: FONTE_FIORILLI,
      OR: ultimas.map((u) => ({ modulo: u.modulo, exercicio: u.exercicio, iniciadoEm: u._max.iniciadoEm ?? undefined })),
    },
    orderBy: [{ exercicio: 'desc' }, { modulo: 'asc' }],
  })

  return NextResponse.json({
    ...estadoSincronizacao(),
    modulos: MODULOS_FIORILLI,
    agendador: configuracaoAgendador(),
    resumo: ultimas.length > 0 ? resumo : [],
    logs,
  })
}

/**
 * Dispara uma sincronizacao. Corpo (opcional):
 *   { "modulos": ["despesas", "receitas"], "exercicios": [2024, 2025], "aguardar": false }
 * Tambem serve de gatilho para cron externo, com Authorization: Bearer $API_BEARER_TOKEN.
 */
export async function POST(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  let corpo: { modulos?: unknown; exercicios?: unknown; aguardar?: unknown } = {}
  try {
    corpo = await request.json()
  } catch {
    corpo = {}
  }

  const modulos = Array.isArray(corpo.modulos)
    ? corpo.modulos.filter((m): m is ModuloFiorilli => MODULOS_FIORILLI.includes(m as ModuloFiorilli))
    : undefined
  const exercicios = Array.isArray(corpo.exercicios)
    ? corpo.exercicios.filter((a): a is number => Number.isInteger(a) && a >= 2000 && a <= 2999)
    : undefined

  if (estadoSincronizacao().executando) {
    return NextResponse.json({ error: 'Ja existe uma sincronizacao em andamento.', codigo: 'em_andamento' }, { status: 409 })
  }

  // Um exercicio de despesas leva perto de um minuto: por padrao roda em segundo plano
  // e o andamento e acompanhado pelo GET.
  if (corpo.aguardar !== true) {
    void sincronizarFiorilli({ modulos, exercicios, origem: 'MANUAL' }).catch((erro) => {
      if (!(erro instanceof SincronizacaoEmAndamentoError)) {
        console.error('[fiorilli] sincronizacao manual falhou:', erro)
      }
    })
    return NextResponse.json({ iniciado: true, modulos: modulos ?? MODULOS_FIORILLI, exercicios }, { status: 202 })
  }

  try {
    return NextResponse.json({ resultados: await sincronizarFiorilli({ modulos, exercicios, origem: 'MANUAL' }) })
  } catch (erro) {
    if (erro instanceof SincronizacaoEmAndamentoError) {
      return NextResponse.json({ error: erro.message, codigo: 'em_andamento' }, { status: 409 })
    }
    console.error('[fiorilli] sincronizacao manual falhou:', erro)
    return NextResponse.json({ error: erro instanceof Error ? erro.message : String(erro) }, { status: 500 })
  }
}
