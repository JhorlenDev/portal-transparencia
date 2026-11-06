import { NextRequest, NextResponse } from 'next/server'
import { getDiariasPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exercicio = searchParams.get('exercicio') || searchParams.get('ano')

    const result = await getDiariasPage(
      {
        exercicio: parseInt(exercicio || String(new Date().getFullYear())),
        orgao: searchParams.get('orgao') || undefined,
        favorecido: searchParams.get('favorecido') || undefined,
        search: searchParams.get('q') || undefined,
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
    return NextResponse.json({ error: 'Erro ao buscar diárias' }, { status: 500 })
  }
}
