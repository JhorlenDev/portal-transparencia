import { NextResponse } from 'next/server'
import { exigirAdmin, respostaDeErro } from '@/lib/admin-guard'
import { rodarTick } from '@/lib/backup/scheduler'

export const dynamic = 'force-dynamic'
export const maxDuration = 3600

/**
 * Gatilho para cron externo (ex.: crontab do servidor):
 *   curl -X POST -H "Authorization: Bearer $API_BEARER_TOKEN" https://.../api/admin/backup/cron
 * Faz a mesma decisao do agendador interno, sem duplicar backup (o lock protege).
 */
export async function POST() {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    return NextResponse.json(await rodarTick())
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
