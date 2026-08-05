import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import {
  COOKIE_SESSAO,
  adminHabilitado,
  conferirSenha,
  criarTokenSessao,
  opcoesCookie,
} from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

/** Freio simples contra forca bruta, por IP, na memoria do processo. */
const chaveTentativas = Symbol.for('portal-transparencia.admin-login-tentativas')
const globalTentativas = globalThis as typeof globalThis & {
  [chaveTentativas]?: Map<string, { falhas: number; ate: number }>
}
if (!globalTentativas[chaveTentativas]) globalTentativas[chaveTentativas] = new Map()
const tentativas = globalTentativas[chaveTentativas]

const MAX_FALHAS = 8
const JANELA_MS = 15 * 60 * 1000

function ipDaRequisicao(request: NextRequest): string {
  const encaminhado = request.headers.get('x-forwarded-for')
  return encaminhado?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'desconhecido'
}

export async function POST(request: NextRequest) {
  if (!adminHabilitado()) {
    return NextResponse.json(
      { error: 'Painel administrativo desabilitado: defina ADMIN_PASSWORD no .env do servidor.' },
      { status: 503 }
    )
  }

  const ip = ipDaRequisicao(request)
  const registro = tentativas.get(ip)

  if (registro && registro.falhas >= MAX_FALHAS && registro.ate > Date.now()) {
    const segundos = Math.ceil((registro.ate - Date.now()) / 1000)
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${segundos}s.` },
      { status: 429, headers: { 'Retry-After': String(segundos) } }
    )
  }

  let senha = ''
  try {
    const corpo = (await request.json()) as { senha?: unknown }
    senha = typeof corpo.senha === 'string' ? corpo.senha : ''
  } catch {
    senha = ''
  }

  if (!(await conferirSenha(senha))) {
    const falhas = (registro?.falhas ?? 0) + 1
    tentativas.set(ip, { falhas, ate: Date.now() + JANELA_MS })
    // Atraso proposital: encarece a tentativa em massa.
    await new Promise((resolve) => setTimeout(resolve, 400))
    return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
  }

  tentativas.delete(ip)

  const { token, expiraEm } = await criarTokenSessao()
  const jar = await cookies()
  jar.set(COOKIE_SESSAO, token, opcoesCookie(expiraEm))

  return NextResponse.json({ ok: true, expiraEm: expiraEm.toISOString() })
}
