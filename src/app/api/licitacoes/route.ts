import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getLicitacoesPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = searchParams.get('ano')
    const status = searchParams.get('status')
    const q = searchParams.get('q')
    const modalidade = searchParams.get('modalidade')

    const result = await getLicitacoesPage(
      {
        ano: parseInt(ano || String(new Date().getFullYear())),
        status: status || undefined,
        search: q || undefined,
        modalidade: modalidade || undefined,
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
  } catch {
    return NextResponse.json({ error: 'Erro ao criar licitação' }, { status: 500 })
  }
}
