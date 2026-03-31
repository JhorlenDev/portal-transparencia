import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const { searchParams } = new URL(request.url)
    const ano = searchParams.get('ano')
    const status = searchParams.get('status')
    
    const where: any = {}
    if (ano) where.ano = parseInt(ano)
    if (status) where.status = status
    
    const convenios = await prisma.convenio.findMany({
      where,
      orderBy: { dataInicioVigencia: 'desc' },
    })
    return NextResponse.json(convenios)
  } catch (error) {
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
    return NextResponse.json(convenio, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar convênio' }, { status: 500 })
  }
}
