import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getReceitasPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exercicio = searchParams.get('exercicio')
    const ano = searchParams.get('ano')
    const q = searchParams.get('q')
    const categoria = searchParams.get('categoria')
    
    const result = await getReceitasPage(
      {
        exercicio: parseInt(exercicio || ano || String(new Date().getFullYear())),
        search: q || undefined,
        categoria: categoria || undefined,
        tipo: searchParams.get('tipo') || undefined,
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
    return NextResponse.json({ error: 'Erro ao buscar receitas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const receita = await prisma.receita.create({
      data: {
        exercicio: data.exercicio,
        mes: data.mes,
        codigoNatureza: data.codigoNatureza,
        naturezaReceita: data.naturezaReceita,
        categoriaEconomica: data.categoriaEconomica,
        fonteRecurso: data.fonteRecurso,
        fonteRecursoNome: data.fonteRecursoNome,
        valorPrevisto: data.valorPrevisto,
        valorArrecadado: data.valorArrecadado,
      },
    })
    return NextResponse.json({
      message: 'Receita criada com sucesso',
      id: receita.id,
      data: receita,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar receita' }, { status: 500 })
  }
}
