import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'
import type { BackupJob } from '@prisma/client'
import { COOKIE_SESSAO, adminHabilitado, comparaSegura, validarTokenSessao } from './admin-session'

/**
 * Exige sessao de admin (cookie assinado) ou, para chamadas de maquina
 * (cron externo), o Bearer token da API. Devolve null quando autorizado.
 */
export async function exigirAdmin(): Promise<NextResponse | null> {
  if (!adminHabilitado()) {
    return NextResponse.json(
      { error: 'Painel administrativo desabilitado: defina ADMIN_PASSWORD no .env do servidor.' },
      { status: 503 }
    )
  }

  const jar = await cookies()
  if (await validarTokenSessao(jar.get(COOKIE_SESSAO)?.value)) return null

  const cabecalhos = await headers()
  const auth = cabecalhos.get('authorization')
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7)
    const permitidos = [process.env.API_BEARER_TOKEN, process.env.NEXTAUTH_SECRET].filter(
      (t): t is string => Boolean(t)
    )
    if (permitidos.some((t) => comparaSegura(token, t))) return null
  }

  return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
}

export interface JobSerializado {
  id: string
  tipo: string
  origem: string
  escopo: string
  status: string
  arquivo: string | null
  tamanhoBytes: number | null
  sha256: string | null
  contentHash: string | null
  temArquivoLocal: boolean
  driveFileId: string | null
  totalTabelas: number | null
  totalRegistros: number | null
  totalArquivos: number | null
  iniciadoEm: string
  finalizadoEm: string | null
  duracaoMs: number | null
  erro: string | null
  log: string | null
}

/** BigInt e Date nao viajam em JSON: converte o job para um formato serializavel. */
export function serializarJob(job: BackupJob): JobSerializado {
  return {
    id: job.id,
    tipo: job.tipo,
    origem: job.origem,
    escopo: job.escopo,
    status: job.status,
    arquivo: job.arquivo,
    tamanhoBytes: job.tamanhoBytes === null ? null : Number(job.tamanhoBytes),
    sha256: job.sha256,
    contentHash: job.contentHash,
    temArquivoLocal: Boolean(job.caminhoLocal),
    driveFileId: job.driveFileId,
    totalTabelas: job.totalTabelas,
    totalRegistros: job.totalRegistros,
    totalArquivos: job.totalArquivos,
    iniciadoEm: job.iniciadoEm.toISOString(),
    finalizadoEm: job.finalizadoEm?.toISOString() ?? null,
    duracaoMs: job.duracaoMs,
    erro: job.erro,
    log: job.log,
  }
}

/** Converte erros conhecidos do backup em resposta HTTP. */
export function respostaDeErro(erro: unknown): NextResponse {
  const mensagem = erro instanceof Error ? erro.message : String(erro)
  const nome = erro instanceof Error ? erro.name : ''

  if (nome === 'BackupEmAndamentoError') {
    return NextResponse.json({ error: mensagem, codigo: 'em_andamento' }, { status: 409 })
  }

  const status = (erro as { status?: number }).status
  const codigo = (erro as { codigo?: string }).codigo

  if (nome === 'DriveError' && typeof status === 'number') {
    return NextResponse.json({ error: mensagem, codigo }, { status: status >= 400 && status < 600 ? status : 502 })
  }

  console.error('[backup] erro:', erro)
  return NextResponse.json({ error: mensagem }, { status: 500 })
}
