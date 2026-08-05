import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_SESSAO, validarTokenSessao } from '@/lib/admin-session'

/**
 * Protege a area administrativa. A validacao aqui e apenas da assinatura do cookie
 * (sem tocar no banco); cada rota de API revalida no servidor.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (pathname === '/admin/login') return NextResponse.next()

  const token = request.cookies.get(COOKIE_SESSAO)?.value
  if (await validarTokenSessao(token)) return NextResponse.next()

  const destino = new URL('/admin/login', request.url)
  destino.searchParams.set('retorno', `${pathname}${search}`)
  return NextResponse.redirect(destino)
}

export const config = {
  matcher: ['/admin/:path*'],
}
