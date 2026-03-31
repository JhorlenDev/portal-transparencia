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
    const servidor = await prisma.servidor.findUnique({
      where: { id },
      include: { orgao: true },
    })

    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado' }, { status: 404 })
    }

    return NextResponse.json(servidor)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar servidor' }, { status: 500 })
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

    const servidor = await prisma.servidor.update({
      where: { id },
      data: {
        nome: data.nome,
        matricula: data.matricula,
        cargo: data.cargo,
        funcao: data.funcao,
        orgaoId: data.orgaoId,
        orgaoNome: data.orgaoNome,
        lotacao: data.lotacao,
        vinculo: data.vinculo,
        cargaHoraria: data.cargaHoraria,
        dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
        anoReferencia: data.anoReferencia,
        mesReferencia: data.mesReferencia,
        remuneracaoBase: data.remuneracaoBase,
        gratificacoes: data.gratificacoes,
        adicionais: data.adicionais,
        indenizacoes: data.indenizacoes,
        remuneracaoBruta: data.remuneracaoBruta,
        impostoRenda: data.impostoRenda,
        previdencia: data.previdencia,
        outrosDescontos: data.outrosDescontos,
        remuneracaoLiquida: data.remuneracaoLiquida,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(servidor)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar servidor' }, { status: 500 })
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
    await prisma.servidor.delete({ where: { id } })
    return NextResponse.json({ message: 'Servidor excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir servidor' }, { status: 500 })
  }
}
