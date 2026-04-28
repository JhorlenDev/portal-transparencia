import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getContratosPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = searchParams.get('ano')
    const status = searchParams.get('status')
    const q = searchParams.get('q')
    const tipo = searchParams.get('tipo')

    const result = await getContratosPage(
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
    return NextResponse.json({
      message: 'Contrato criado com sucesso',
      id: contrato.id,
      data: contrato,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar contrato' }, { status: 500 })
  }
}
