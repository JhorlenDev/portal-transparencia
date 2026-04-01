import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exercicio = searchParams.get('exercicio')
    
    const where = exercicio ? { exercicio: parseInt(exercicio) } : {}
    
    const despesas = await prisma.despesa.findMany({
      where,
      orderBy: { dataEmpenho: 'desc' },
    })
    return NextResponse.json(despesas)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar despesas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const despesa = await prisma.despesa.create({
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
      },
    })
    return NextResponse.json({
      message: 'Despesa criada com sucesso',
      id: despesa.id,
      data: despesa,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 })
  }
}
