import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await authenticateRequest(request)
  if (authError) return authError

  try {
    const { id } = await params
    const licitacao = await prisma.licitacao.findUnique({
      where: { id },
      include: { orgao: true, contratos: true },
    })

    if (!licitacao) {
      return NextResponse.json({ error: 'Licitação não encontrada' }, { status: 404 })
    }

    return NextResponse.json(licitacao)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar licitação' }, { status: 500 })
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

    const licitacao = await prisma.licitacao.update({
      where: { id },
      data: {
        numero: data.numero,
        ano: data.ano,
        modalidade: data.modalidade,
        criterioJulgamento: data.criterioJulgamento,
        objeto: data.objeto,
        objetoResumido: data.objetoResumido,
        status: data.status,
        dataAbertura: data.dataAbertura ? new Date(data.dataAbertura) : null,
        valorEstimado: data.valorEstimado,
        numeroProcesso: data.numeroProcesso,
        orgaoId: data.orgaoId,
        orgaoNome: data.orgaoNome,
        justificativa: data.justificativa,
        linkPncp: data.linkPncp,
        autoridade: data.autoridade,
        regulamento: data.regulamento,
        numeroEdital: data.numeroEdital,
        numeroProcAdministrativo: data.numeroProcAdministrativo,
        fundamentoLegal: data.fundamentoLegal,
        anoReferencia: data.anoReferencia,
        referenciaProcesso: data.referenciaProcesso,
        reeditacao: data.reeditacao,
        convenioTransfergov: data.convenioTransfergov,
        anoConvenio: data.anoConvenio,
        enviarTransfergov: data.enviarTransfergov,
        tipoObjeto: data.tipoObjeto,
        fonteOrcamentaria: data.fonteOrcamentaria,
        observacao: data.observacao,
        tipoContrato: data.tipoContrato,
        validadeMeses: data.validadeMeses,
        prazoPagamento: data.prazoPagamento,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(licitacao)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar licitação' }, { status: 500 })
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
    await prisma.licitacao.delete({ where: { id } })
    return NextResponse.json({ message: 'Licitação excluída com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir licitação' }, { status: 500 })
  }
}
