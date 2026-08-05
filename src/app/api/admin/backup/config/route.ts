import { NextResponse, type NextRequest } from 'next/server'
import { exigirAdmin, respostaDeErro } from '@/lib/admin-guard'
import { getBackupConfig, salvarBackupConfig } from '@/lib/backup/config'

export const dynamic = 'force-dynamic'

export async function GET() {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    return NextResponse.json(await getBackupConfig())
  } catch (erro) {
    return respostaDeErro(erro)
  }
}

export async function PUT(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    const corpo = await request.json()
    return NextResponse.json(await salvarBackupConfig(corpo))
  } catch (erro) {
    if (erro instanceof Error && erro.message.startsWith('Selecione')) {
      return NextResponse.json({ error: erro.message }, { status: 400 })
    }
    return respostaDeErro(erro)
  }
}
