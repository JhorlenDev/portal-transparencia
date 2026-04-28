import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest } from '@/lib/auth'
import { getServidoresPage, parsePaginationParams } from '@/lib/site-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const anoReferencia = searchParams.get('anoReferencia')
    const ano = searchParams.get('ano')
    const orgaoNome = searchParams.get('orgaoNome')
    const q = searchParams.get('q')
    const vinculo = searchParams.get('vinculo')

    const result = await getServidoresPage(
      {
        anoReferencia: parseInt(anoReferencia || ano || String(new Date().getFullYear())),
        search: q || undefined,
        vinculo: vinculo || undefined,
        lotacao: orgaoNome || undefined,
      },
      parsePaginationParams({
        page: searchParams.get('page') || undefined,
        limit: searchParams.get('limit') || undefined,
      })
    )

    return NextResponse.json(result)
  } catch {
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
    return NextResponse.json({
      message: 'Servidor criado com sucesso',
      id: servidor.id,
      data: servidor,
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro ao criar servidor' }, { status: 500 })
  }
}
