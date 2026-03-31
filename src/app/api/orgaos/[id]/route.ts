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
    const orgao = await prisma.orgao.findUnique({
      where: { id },
      include: {
        licitacoes: true,
        contratos: true,
        despesas: true,
        servidores: true,
      },
    })

    if (!orgao) {
      return NextResponse.json({ error: 'Órgão não encontrado' }, { status: 404 })
    }

    return NextResponse.json(orgao)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar órgão' }, { status: 500 })
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

    const orgao = await prisma.orgao.update({
      where: { id },
      data: {
        nome: data.nome,
        sigla: data.sigla,
        cnpj: data.cnpj,
        ativo: data.ativo,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(orgao)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar órgão' }, { status: 500 })
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
    await prisma.orgao.delete({ where: { id } })
    return NextResponse.json({ message: 'Órgão excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir órgão' }, { status: 500 })
  }
}
