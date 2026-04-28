import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    const receita = await prisma.receita.findUnique({ where: { id } })

    if (!receita) {
      return NextResponse.json({ error: 'Receita não encontrada' }, { status: 404 })
    }

    return NextResponse.json(receita)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar receita' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    const data = await request.json()

    const receita = await prisma.receita.update({
      where: { id },
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
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(receita)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar receita' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.receita.delete({ where: { id } })
    return NextResponse.json({ message: 'Receita excluída com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir receita' }, { status: 500 })
  }
}
