import { NextResponse, type NextRequest } from 'next/server'
import { exigirAdmin, respostaDeErro, serializarJob } from '@/lib/admin-guard'
import { enviarJobParaDrive } from '@/lib/backup/runner'

export const dynamic = 'force-dynamic'
export const maxDuration = 3600

export async function POST(_request: NextRequest, ctx: RouteContext<'/api/admin/backup/jobs/[id]/push'>) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const { id } = await ctx.params
    return NextResponse.json(serializarJob(await enviarJobParaDrive(id)))
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
