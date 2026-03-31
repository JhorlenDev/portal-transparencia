import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')
    const ativo = searchParams.get('ativo')
    
    const where: any = {}
    if (categoria) where.categoria = categoria
    if (ativo !== null) where.ativo = ativo === 'true'
    
    const datasets = await prisma.dataset.findMany({
      where,
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(datasets)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar datasets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const dataset = await prisma.dataset.create({
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
        ativo: data.ativo ?? true,
      },
    })
    return NextResponse.json(dataset, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar dataset' }, { status: 500 })
  }
}
