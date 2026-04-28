import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    const contrato = await prisma.contrato.findUnique({
      where: { id },
      include: { orgao: true, licitacao: true },
    })

    if (!contrato) {
      return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    }

    return NextResponse.json(contrato)
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar contrato' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    const data = await request.json()

    const contrato = await prisma.contrato.update({
      where: { id },
      data: {
        numero: data.numero,
        ano: data.ano,
        tipoContrato: data.tipoContrato,
        objeto: data.objeto,
        objetoResumido: data.objetoResumido,
        status: data.status,
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
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(contrato)
  } catch {
    return NextResponse.json({ error: 'Erro ao atualizar contrato' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    await prisma.contrato.delete({ where: { id } })
    return NextResponse.json({ message: 'Contrato excluído com sucesso' })
  } catch {
    return NextResponse.json({ error: 'Erro ao excluir contrato' }, { status: 500 })
  }
}
