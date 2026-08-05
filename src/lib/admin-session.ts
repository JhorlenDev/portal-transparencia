/**
 * Sessao do painel administrativo: senha unica no .env + cookie HttpOnly assinado (HMAC-SHA256).
 *
 * Usa WebCrypto (nao node:crypto) porque este modulo tambem roda no proxy.ts,
 * que pode ser executado fora do runtime Node.
 */

export const COOKIE_SESSAO = 'pt_admin'
export const COOKIE_NONCE_DRIVE = 'pt_drive_nonce'

const DURACAO_PADRAO_HORAS = 12

interface Payload {
  sub: string
  iat: number
  exp: number
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(texto: string): Uint8Array<ArrayBuffer> {
  const base = texto.replace(/-/g, '+').replace(/_/g, '/')
  const pad = base.length % 4 === 0 ? '' : '='.repeat(4 - (base.length % 4))
  const bin = atob(base + pad)
  const bytes = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function getSegredoSessao(): string {
  const segredo =
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.API_BEARER_TOKEN?.trim()

  if (!segredo) {
    throw new Error('Defina ADMIN_SESSION_SECRET (ou NEXTAUTH_SECRET) para assinar a sessao do admin.')
  }
  return segredo
}

async function getChaveHmac(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSegredoSessao()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export function adminHabilitado(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_PASSWORD.length > 0)
}

/** Comparacao de tempo constante entre duas strings. */
export function comparaSegura(a: string, b: string): boolean {
  const ba = new TextEncoder().encode(a)
  const bb = new TextEncoder().encode(b)
  let diff = ba.length ^ bb.length
  const max = Math.max(ba.length, bb.length)
  for (let i = 0; i < max; i++) {
    diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0)
  }
  return diff === 0
}

export async function conferirSenha(senha: string): Promise<boolean> {
  const esperada = process.env.ADMIN_PASSWORD ?? ''
  if (!esperada) return false
  return comparaSegura(senha, esperada)
}

export async function criarTokenSessao(horas = DURACAO_PADRAO_HORAS): Promise<{ token: string; expiraEm: Date }> {
  const agora = Date.now()
  const payload: Payload = {
    sub: 'admin',
    iat: Math.floor(agora / 1000),
    exp: Math.floor(agora / 1000) + horas * 3600,
  }

  const corpo = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const assinatura = await crypto.subtle.sign('HMAC', await getChaveHmac(), new TextEncoder().encode(corpo))

  return {
    token: `${corpo}.${b64urlEncode(new Uint8Array(assinatura))}`,
    expiraEm: new Date(payload.exp * 1000),
  }
}

export async function validarTokenSessao(token: string | undefined | null): Promise<boolean> {
  if (!token) return false

  const partes = token.split('.')
  if (partes.length !== 2) return false

  const [corpo, assinatura] = partes

  let valida = false
  try {
    valida = await crypto.subtle.verify(
      'HMAC',
      await getChaveHmac(),
      b64urlDecode(assinatura),
      new TextEncoder().encode(corpo)
    )
  } catch {
    return false
  }
  if (!valida) return false

  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(corpo))) as Payload
    return payload.sub === 'admin' && payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}

export function opcoesCookie(expiraEm: Date) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiraEm,
  }
}
