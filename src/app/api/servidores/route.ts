import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anoReferencia = searchParams.get('anoReferencia')
    const orgaoNome = searchParams.get('orgaoNome')
    
    const where: any = {}
    if (anoReferencia) where.anoReferencia = parseInt(anoReferencia)
    if (orgaoNome) where.orgaoNome = orgaoNome
    
    const servidores = await prisma.servidor.findMany({
      where,
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(servidores)
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar servidores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authError = await authenticateRequest(request)
  if (authError) return authError
  try {
    const data = await request.json()
    const servidor = await prisma.servidor.create({
      data: {
        nome: data.nome,
        matricula: data.matricula,
        cargo: data.cargo,
        funcao: data.funcao,
        orgaoId: data.orgaoId,
        orgaoNome: data.orgaoNome,
        lotacao: data.lotacao,
        vinculo: data.vinculo ?? 'efetivo',
        cargaHoraria: data.cargaHoraria,
        dataAdmissao: data.dataAdmissao ? new Date(data.dataAdmissao) : null,
        anoReferencia: data.anoReferencia,
        mesReferencia: data.mesReferencia,
        remuneracaoBase: data.remuneracaoBase,
        gratificacoes: data.gratificacoes ?? 0,
        adicionais: data.adicionais ?? 0,
        indenizacoes: data.indenizacoes ?? 0,
        remuneracaoBruta: data.remuneracaoBruta,
        impostoRenda: data.impostoRenda,
        previdencia: data.previdencia ?? 0,
        outrosDescontos: data.outrosDescontos,
        remuneracaoLiquida: data.remuneracaoLiquida,
      },
    })
    return NextResponse.json(servidor, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar servidor' }, { status: 500 })
  }
}
