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
    const convenio = await prisma.convenio.findUnique({ where: { id } })

    if (!convenio) {
      return NextResponse.json({ error: 'Convênio não encontrado' }, { status: 404 })
    }

    return NextResponse.json(convenio)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar convênio' }, { status: 500 })
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

    const convenio = await prisma.convenio.update({
      where: { id },
      data: {
        numero: data.numero,
        ano: data.ano,
        tipo: data.tipo,
        objeto: data.objeto,
        objetoResumido: data.objetoResumido,
        status: data.status,
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
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(convenio)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar convênio' }, { status: 500 })
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
    await prisma.convenio.delete({ where: { id } })
    return NextResponse.json({ message: 'Convênio excluído com sucesso' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir convênio' }, { status: 500 })
  }
}
