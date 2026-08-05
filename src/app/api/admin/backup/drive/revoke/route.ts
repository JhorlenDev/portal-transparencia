import { NextResponse } from 'next/server'
import { exigirAdmin, respostaDeErro } from '@/lib/admin-guard'
import { revogarConexao } from '@/lib/backup/drive'
import { getBackupConfig } from '@/lib/backup/config'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    await revogarConexao()

    // Sem conta conectada, backups agendados para a nuvem nao tem como rodar.
    const config = await getBackupConfig()
    if (config.nuvemAtivo) {
      await prisma.backupConfig.update({ where: { id: config.id }, data: { nuvemAtivo: false } })
    }

    return NextResponse.json({ ok: true })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
