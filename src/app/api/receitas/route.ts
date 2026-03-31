import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const { searchParams } = new URL(request.url)
    const exercicio = searchParams.get('exercicio')
    
    const where = exercicio ? { exercicio: parseInt(exercicio) } : {}
    
    const receitas = await prisma.receita.findMany({
      where,
      orderBy: { exercicio: 'desc' },
    })
    return NextResponse.json(receitas)
  } catch (error) {
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
    return NextResponse.json(receita, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar receita' }, { status: 500 })
  }
}
