import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdmin, respostaDeErro, serializarJob } from '@/lib/admin-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const params = request.nextUrl.searchParams
    const limite = Math.min(200, Math.max(1, Number(params.get('limite') ?? 30)))
    const tipo = params.get('tipo')

    const jobs = await prisma.backupJob.findMany({
      where: tipo === 'LOCAL' || tipo === 'NUVEM' ? { tipo } : undefined,
      orderBy: { iniciadoEm: 'desc' },
      take: limite,
    })

    return NextResponse.json({ jobs: jobs.map(serializarJob), total: await prisma.backupJob.count() })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
