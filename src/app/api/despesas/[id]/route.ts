import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    const despesa = await prisma.despesa.findUnique({
      where: { id },
      include: { orgao: true },
    })

    if (!despesa) {
      return NextResponse.json({ error: 'Despesa não encontrada' }, { status: 404 })
    }

    return NextResponse.json(despesa)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar despesa' }, { status: 500 })
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

    const despesa = await prisma.despesa.update({
      where: { id },
      data: {
        exercicio: data.exercicio,
        numeroEmpenho: data.numeroEmpenho,
        dataEmpenho: data.dataEmpenho ? new Date(data.dataEmpenho) : null,
        tipoMovimento: data.tipoMovimento,
        credorNome: data.credorNome,
        credorCpfCnpj: data.credorCpfCnpj,
        objeto: data.objeto,
        historico: data.historico,
        orgaoId: data.orgaoId,
        orgaoNome: data.orgaoNome,
        elementoDespesa: data.elementoDespesa,
        elementoDespesaNome: data.elementoDespesaNome,
        valorEmpenhado: data.valorEmpenhado,
        valorLiquidado: data.valorLiquidado,
        valorPago: data.valorPago,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(despesa)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar despesa' }, { status: 500 })
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
    await prisma.despesa.delete({ where: { id } })
    return NextResponse.json({ message: 'Despesa excluída com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir despesa' }, { status: 500 })
  }
}
