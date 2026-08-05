import { NextResponse, type NextRequest } from 'next/server'
import { exigirAdmin, respostaDeErro, serializarJob } from '@/lib/admin-guard'
import { DESTINOS, ESCOPOS, type DestinoBackup, type EscopoBackup } from '@/lib/backup/config'
import { BackupEmAndamentoError, lockEmMemoria } from '@/lib/backup/lock'
import { executarBackup } from '@/lib/backup/runner'

export const dynamic = 'force-dynamic'
export const maxDuration = 3600

export async function POST(request: NextRequest) {
  const negado = await exigirAdmin()
  if (negado) return negado

  let corpo: { escopo?: string; destino?: string; aguardar?: boolean; forcar?: boolean } = {}
  try {
    corpo = await request.json()
  } catch {
    corpo = {}
  }

  const escopo = (ESCOPOS.includes(corpo.escopo as EscopoBackup) ? corpo.escopo : 'COMPLETO') as EscopoBackup
  const destino = (DESTINOS.includes(corpo.destino as DestinoBackup) ? corpo.destino : 'LOCAL') as DestinoBackup

  const emAndamento = lockEmMemoria()
  if (emAndamento) {
    return NextResponse.json(
      { error: 'Ja existe um backup em andamento.', codigo: 'em_andamento' },
      { status: 409 }
    )
  }

  // Backups grandes levam minutos: por padrao a execucao roda em segundo plano
  // e a interface acompanha pelo historico.
  if (!corpo.aguardar) {
    void executarBackup({ escopo, destino, origem: 'MANUAL', forcar: corpo.forcar }).catch((erro) => {
      if (!(erro instanceof BackupEmAndamentoError)) {
        console.error('[backup] execucao manual falhou:', erro)
      }
    })

    return NextResponse.json({ iniciado: true, escopo, destino }, { status: 202 })
  }

  try {
    const resultado = await executarBackup({ escopo, destino, origem: 'MANUAL', forcar: corpo.forcar })
    return NextResponse.json({
      ok: true,
      duplicado: resultado.duplicado,
      contentHash: resultado.contentHash,
      avisos: resultado.avisos,
      jobs: resultado.jobs.map(serializarJob),
    })
  } catch (erro) {
    return respostaDeErro(erro)
  }
}
