import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const orgaos = await prisma.orgao.findMany({
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(orgaos)
  } catch (error) {
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
    return NextResponse.json(orgao, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar órgão' }, { status: 500 })
  }
}
