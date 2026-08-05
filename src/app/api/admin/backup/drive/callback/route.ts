import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE_NONCE_DRIVE, comparaSegura } from '@/lib/admin-session'
import { exigirAdmin } from '@/lib/admin-guard'
import { quotaDaConta, salvarConexao, trocarLinkCode } from '@/lib/backup/drive'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function voltarParaPainel(request: NextRequest, params: Record<string, string>): NextResponse {
  const destino = new URL('/admin/backup', request.nextUrl.origin)
  for (const [chave, valor] of Object.entries(params)) destino.searchParams.set(chave, valor)
  return NextResponse.redirect(destino)
}

export async function GET(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  const linkCode = request.nextUrl.searchParams.get('link_code')
  const erroBroker = request.nextUrl.searchParams.get('error')
  const nonceRecebido = request.nextUrl.searchParams.get('st')

  if (erroBroker) {
    return voltarParaPainel(request, { drive: 'erro', msg: `O BackupHub recusou a conexao: ${erroBroker}` })
  }

  if (!linkCode) {
    return voltarParaPainel(request, { drive: 'erro', msg: 'A conexao voltou sem o codigo de vinculo.' })
  }

  const jar = await cookies()
  const nonceEsperado = jar.get(COOKIE_NONCE_DRIVE)?.value
  jar.delete(COOKIE_NONCE_DRIVE)

  if (nonceEsperado && nonceRecebido && !comparaSegura(nonceRecebido, nonceEsperado)) {
    return voltarParaPainel(request, {
      drive: 'erro',
      msg: 'A conexao nao pode ser confirmada (codigo de seguranca diferente). Tente novamente.',
    })
  }

  try {
    const resultado = await trocarLinkCode(linkCode)
    const conta = await salvarConexao(resultado)

    // Cota atualizada direto do Google (nao bloqueia a conexao se falhar).
    try {
      const cota = await quotaDaConta()
      await prisma.backupDriveConta.update({
        where: { id: conta.id },
        data: {
          quotaTotal: cota.total ? String(cota.total) : conta.quotaTotal,
          quotaUsada: cota.usado ? String(cota.usado) : conta.quotaUsada,
          email: cota.email ?? conta.email,
        },
      })
    } catch {
      // segue com os dados que o broker devolveu
    }

    return voltarParaPainel(request, { drive: 'ok', conta: resultado.email ?? '' })
  } catch (erro) {
    return voltarParaPainel(request, { drive: 'erro', msg: (erro as Error).message })
  }
}
