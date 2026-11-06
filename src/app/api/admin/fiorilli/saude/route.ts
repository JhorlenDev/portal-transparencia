import { NextResponse } from 'next/server'
import { exigirAdmin } from '@/lib/admin-guard'
import { verificarSaude } from '@/lib/fiorilli/saude'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Testa agora cada listagem da Fiorilli (consulta pequena, sem retry). */
export async function GET() {
  const negado = await exigirAdmin()
  if (negado) return negado

  return NextResponse.json({ verificadoEm: new Date().toISOString(), listagens: await verificarSaude() })
}
