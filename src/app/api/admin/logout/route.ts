import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { COOKIE_SESSAO } from '@/lib/admin-session'

export const dynamic = 'force-dynamic'

export async function POST() {
  const jar = await cookies()
  jar.delete(COOKIE_SESSAO)
  return NextResponse.json({ ok: true })
}
