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
    const dataset = await prisma.dataset.findUnique({ where: { id } })

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset não encontrado' }, { status: 404 })
    }

    return NextResponse.json(dataset)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar dataset' }, { status: 500 })
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

    const dataset = await prisma.dataset.update({
      where: { id },
      data: {
        nome: data.nome,
        slug: data.slug,
        descricao: data.descricao,
        categoria: data.categoria,
        periodicidade: data.periodicidade,
        ultimaAtualizacao: new Date(data.ultimaAtualizacao),
        formatosDisponiveis: data.formatosDisponiveis,
        totalRegistros: data.totalRegistros,
        dicionarioDados: data.dicionarioDados,
        ativo: data.ativo,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(dataset)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar dataset' }, { status: 500 })
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
    await prisma.dataset.delete({ where: { id } })
    return NextResponse.json({ message: 'Dataset excluído com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir dataset' }, { status: 500 })
  }
}
