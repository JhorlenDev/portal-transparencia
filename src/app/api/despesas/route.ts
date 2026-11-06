import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getDespesasPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const exercicio = searchParams.get('exercicio')
    const ano = searchParams.get('ano')
    const q = searchParams.get('q')
    
    const result = await getDespesasPage(
      {
        exercicio: parseInt(exercicio || ano || String(new Date().getFullYear())),
        search: q || undefined,
        categoria: searchParams.get('categoria') || undefined,
        orgao: searchParams.get('orgao') || undefined,
        credor: searchParams.get('credor') || undefined,
        fonteRecurso: searchParams.get('fonteRecurso') || undefined,
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
  } catch {
    return NextResponse.json({ error: 'Erro ao criar despesa' }, { status: 500 })
  }
}
