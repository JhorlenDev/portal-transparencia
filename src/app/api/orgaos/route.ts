import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const orgaos = await prisma.orgao.findMany({
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(orgaos)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar órgãos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const orgao = await prisma.orgao.create({
      data: {
        nome: data.nome,
        sigla: data.sigla,
        cnpj: data.cnpj,
        ativo: data.ativo ?? true,
      },
    })
    return NextResponse.json({
      message: 'Órgão criado com sucesso',
      id: orgao.id,
      data: orgao,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar órgão' }, { status: 500 })
  }
}
