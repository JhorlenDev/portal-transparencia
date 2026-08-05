import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdmin, respostaDeErro, serializarJob } from '@/lib/admin-guard'
import { excluirJob } from '@/lib/backup/runner'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/backup/jobs/[id]'>) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const { id } = await ctx.params
    const job = await prisma.backupJob.findUnique({ where: { id } })
    if (!job) return NextResponse.json({ error: 'Backup nao encontrado.' }, { status: 404 })
    return NextResponse.json(serializarJob(job))
  } catch (erro) {
    return respostaDeErro(erro)
  }
}

export async function DELETE(request: NextRequest, ctx: RouteContext<'/api/admin/backup/jobs/[id]'>) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const { id } = await ctx.params
    const apagarNoDrive = request.nextUrl.searchParams.get('drive') === '1'
    await excluirJob(id, apagarNoDrive)
    return NextResponse.json({ ok: true })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
