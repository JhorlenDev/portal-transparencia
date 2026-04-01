import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = searchParams.get('ano')
    const status = searchParams.get('status')
    
    const where: any = {}
    if (ano) where.ano = parseInt(ano)
    if (status) where.status = status
    
    const licitacoes = await prisma.licitacao.findMany({
      where,
      orderBy: { dataAbertura: 'desc' },
    })
    return NextResponse.json(licitacoes)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar licitações' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const licitacao = await prisma.licitacao.create({
      data: {
        numero: data.numero,
        ano: data.ano,
        modalidade: data.modalidade,
        criterioJulgamento: data.criterioJulgamento,
        objeto: data.objeto,
        objetoResumido: data.objetoResumido,
        status: data.status ?? 'planejamento',
        dataAbertura: data.dataAbertura ? new Date(data.dataAbertura) : null,
        valorEstimado: data.valorEstimado,
        numeroProcesso: data.numeroProcesso,
        orgaoId: data.orgaoId,
        orgaoNome: data.orgaoNome,
        justificativa: data.justificativa,
        linkPncp: data.linkPncp,
      },
    })
    return NextResponse.json({
      message: 'Licitação criada com sucesso',
      id: licitacao.id,
      data: licitacao,
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar licitação' }, { status: 500 })
  }
}
