import { NextRequest, NextResponse } from 'next/server'
import { getTransferenciasPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exercicio = searchParams.get('exercicio') || searchParams.get('ano')
    const mes = searchParams.get('mes')

    const result = await getTransferenciasPage(
      {
        exercicio: parseInt(exercicio || String(new Date().getFullYear())),
        mes: mes ? parseInt(mes) : undefined,
        entidade: searchParams.get('entidade') || undefined,
        ordenar: searchParams.get('ordenar') || undefined,
        ordem: searchParams.get('ordem') || undefined,
      },
      parsePaginationParams({
        page: searchParams.get('page') || undefined,
        limit: searchParams.get('limit') || undefined,
      })
    )

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar transferências' }, { status: 500 })
  }
}
