import fs from 'node:fs'
import { Readable } from 'node:stream'
import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirAdmin, respostaDeErro } from '@/lib/admin-guard'
import { assertDentroDoBackupDir } from '@/lib/backup/paths'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest, ctx: RouteContext<'/api/admin/backup/jobs/[id]/download'>) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const { id } = await ctx.params
    const job = await prisma.backupJob.findUnique({ where: { id } })

    if (!job) return NextResponse.json({ error: 'Backup nao encontrado.' }, { status: 404 })
    if (!job.caminhoLocal) {
      return NextResponse.json(
        { error: 'Esse backup nao tem copia local (removido pela retencao ou enviado so para a nuvem).' },
        { status: 404 }
      )
    }

    const caminho = assertDentroDoBackupDir(job.caminhoLocal)
    const info = await fs.promises.stat(caminho).catch(() => null)
    if (!info) {
      return NextResponse.json({ error: 'O arquivo do backup nao esta mais no disco.' }, { status: 410 })
    }

    const stream = Readable.toWeb(
      fs.createReadStream(caminho, { highWaterMark: 1024 * 1024 })
    ) as unknown as ReadableStream

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Length': String(info.size),
        'Content-Disposition': `attachment; filename="${job.arquivo ?? 'backup.tar.gz'}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
