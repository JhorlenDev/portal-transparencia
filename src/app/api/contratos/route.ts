import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

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
    
    const contratos = await prisma.contrato.findMany({
      where,
      orderBy: { dataInicioVigencia: 'desc' },
    })
    return NextResponse.json(contratos)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar contratos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const contrato = await prisma.contrato.create({
      data: {
        numero: data.numero,
        ano: data.ano,
        tipoContrato: data.tipoContrato,
        objeto: data.objeto,
        objetoResumido: data.objetoResumido,
        status: data.status ?? 'vigente',
        dataInicioVigencia: new Date(data.dataInicioVigencia),
        dataFimVigencia: data.dataFimVigencia ? new Date(data.dataFimVigencia) : null,
        valorInicial: data.valorInicial,
        valorAtual: data.valorAtual,
        valorPago: data.valorPago,
        contratadoNome: data.contratadoNome,
        contratadoCnpj: data.contratadoCnpj,
        orgaoId: data.orgaoId,
        orgaoNome: data.orgaoNome,
        licitacaoId: data.licitacaoId,
        licitacaoNumero: data.licitacaoNumero,
        gestorNome: data.gestorNome,
        gestorCargo: data.gestorCargo,
        fiscalNome: data.fiscalNome,
        fiscalCargo: data.fiscalCargo,
        linkPncp: data.linkPncp,
      },
    })
    return NextResponse.json(contrato, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }
}
