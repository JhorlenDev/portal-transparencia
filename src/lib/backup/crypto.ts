import crypto from 'node:crypto'

const VERSAO = 'v1'
const SALT = 'portal-transparencia/backup/v1'

function getChave(): Buffer {
  const segredo =
    process.env.BACKUP_ENCRYPTION_KEY?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.API_BEARER_TOKEN?.trim()

  if (!segredo) {
    throw new Error(
      'Defina BACKUP_ENCRYPTION_KEY (ou NEXTAUTH_SECRET) para cifrar o token do Google Drive.'
    )
  }

  return crypto.scryptSync(segredo, SALT, 32)
}

/** Cifra um segredo (brokerToken) com AES-256-GCM. Formato: v1:iv:tag:cipher (base64). */
export function cifrarSegredo(texto: string): string {
  const chave = getChave()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', chave, iv)
  const cifrado = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSAO, iv.toString('base64'), tag.toString('base64'), cifrado.toString('base64')].join(':')
}

export function decifrarSegredo(payload: string): string {
  const partes = payload.split(':')
  if (partes.length !== 4 || partes[0] !== VERSAO) {
    throw new Error('Formato de segredo cifrado invalido')
  }

  const [, ivB64, tagB64, cipherB64] = partes
  const decipher = crypto.createDecipheriv('aes-256-gcm', getChave(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(cipherB64, 'base64')), decipher.final()]).toString('utf8')
}

/** Mascara um segredo para exibicao/log: mantem so o inicio. */
export function mascarar(valor: string | null | undefined): string {
  if (!valor) return ''
  return `${valor.slice(0, 6)}${'*'.repeat(Math.max(0, Math.min(12, valor.length - 6)))}`
}
