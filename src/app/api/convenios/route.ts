import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getConveniosPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = searchParams.get('ano')
    const status = searchParams.get('status')
    const q = searchParams.get('q')
    const tipo = searchParams.get('tipo')

    const result = await getConveniosPage(
      {
        ano: parseInt(ano || String(new Date().getFullYear())),
        status: status || undefined,
        search: q || undefined,
        tipo: tipo || undefined,
      },
      parsePaginationParams({
        page: searchParams.get('page') || undefined,
        limit: searchParams.get('limit') || undefined,
      })
    )

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar convênios' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const convenio = await prisma.convenio.create({
      data: {
        numero: data.numero,
        ano: data.ano,
        tipo: data.tipo,
        objeto: data.objeto,
        objetoResumido: data.objetoResumido,
        status: data.status ?? 'em_execucao',
        concedente: data.concedente,
        concedenteCnpj: data.concedenteCnpj,
        convenente: data.convenente,
        dataInicioVigencia: new Date(data.dataInicioVigencia),
        dataFimVigencia: data.dataFimVigencia ? new Date(data.dataFimVigencia) : null,
        valorTotal: data.valorTotal,
        valorRepasse: data.valorRepasse,
        valorContrapartida: data.valorContrapartida,
        valorExecutado: data.valorExecutado,
        numeroProcesso: data.numeroProcesso,
        linkPlataforma: data.linkPlataforma,
      },
    })
    return NextResponse.json({
      message: 'Convênio criado com sucesso',
      id: convenio.id,
      data: convenio,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar convênio' }, { status: 500 })
  }
}
