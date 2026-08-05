import { NextResponse } from 'next/server'

// Caminho relativo, e nao `@/package.json`: o alias `@/*` aponta para `src/`,
// e o package.json esta na raiz do projeto.
import packageJson from '../../../../../package.json'

export const dynamic = 'force-dynamic'

/**
 * Liveness da aplicacao. E o que o HEALTHCHECK da imagem consulta e o que o
 * deploy espera responder 200 antes de dar o deploy por concluido.
 *
 * Nao toca no banco de proposito: um banco fora do ar deixaria o container
 * `unhealthy` e o Docker o reiniciaria em loop, quando o certo e ele continuar
 * de pe servindo o que consegue. Para conferir o banco existe `?db=1`, usado
 * sob demanda no diagnostico, nunca pelo HEALTHCHECK.
 *
 * O `uptime` importa durante uma migracao: com duas instancias vivas (a antiga
 * na VPS 160 e a nova na 161) um 200 nao diz qual delas atendeu — dois uptimes
 * diferentes dizem.
 */
export async function GET(request: Request) {
  const querBanco = new URL(request.url).searchParams.get('db') === '1'

  let banco: { ok: boolean; erro?: string } | undefined
  if (querBanco) {
    try {
      const { prisma } = await import('@/lib/prisma')
      await prisma.$queryRaw`SELECT 1`
      banco = { ok: true }
    } catch (erro) {
      banco = { ok: false, erro: erro instanceof Error ? erro.message : String(erro) }
    }
  }

  return NextResponse.json(
    {
      ok: banco ? banco.ok : true,
      service: 'portal-transparencia',
      version: (packageJson as { version?: string }).version ?? '0.0.0',
      uptime: Math.round(process.uptime()),
      time: new Date().toISOString(),
      ...(banco ? { banco } : {}),
    },
    {
      status: banco && !banco.ok ? 503 : 200,
      headers: { 'cache-control': 'no-store' },
    }
  )
}
