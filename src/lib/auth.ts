import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'

const API_KEYS = new Set([
  process.env.NEXTAUTH_SECRET || '',
  process.env.API_BEARER_TOKEN || '',
  'dev-api-key-2026',
])

export async function authenticateRequest(_request: NextRequest): Promise<NextResponse | null> {
  void _request

  const headersList = await headers()
  const authHeader = headersList.get('authorization')

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authorization header não fornecido' },
      { status: 401 }
    )
  }

  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer') {
    return NextResponse.json(
      { error: 'Tipo de autenticação inválido. Use: Bearer <token>' },
      { status: 401 }
    )
  }

  if (!token || !API_KEYS.has(token)) {
    return NextResponse.json(
      { error: 'Token inválido ou expirado' },
      { status: 401 }
    )
  }

  return null
}

export function createUnauthorizedResponse(message = 'Não autorizado') {
  return NextResponse.json(
    { error: message },
    { status: 401 }
  )
}

export function createForbiddenResponse(message = 'Acesso proibido') {
  return NextResponse.json(
    { error: message },
    { status: 403 }
  )
}
