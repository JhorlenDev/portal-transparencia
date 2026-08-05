import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NONCE_DRIVE } from '@/lib/admin-session'
import { exigirAdmin, respostaDeErro } from '@/lib/admin-guard'
import { BROKER_BASE } from '@/lib/backup/drive'

export const dynamic = 'force-dynamic'

/** Base publica do app: usada no return_url que o BackupHub vai chamar de volta. */
function baseDoApp(request: NextRequest): string {
  const configurada = process.env.NEXT_PUBLIC_APP_URL?.trim()
  return (configurada && configurada.length > 0 ? configurada : request.nextUrl.origin).replace(/\/$/, '')
}

export async function GET(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  try {
    // app_folder=1 limita o acesso a pasta criada pelo app (sem aviso de "app nao verificado");
    // app_folder=0 permite escolher qualquer pasta do Drive.
    const apenasPastaDoApp = request.nextUrl.searchParams.get('app_folder') === '1'

    const nonce = crypto.randomBytes(16).toString('hex')
    const jar = await cookies()
    jar.set(COOKIE_NONCE_DRIVE, nonce, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600,
    })

    const retorno = new URL(`${baseDoApp(request)}/api/admin/backup/drive/callback`)
    retorno.searchParams.set('st', nonce)

    const destino = new URL(`${BROKER_BASE}/api/broker/gdrive/connect`)
    destino.searchParams.set('return_url', retorno.toString())
    destino.searchParams.set('app_folder', apenasPastaDoApp ? '1' : '0')

    return NextResponse.redirect(destino.toString())
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
