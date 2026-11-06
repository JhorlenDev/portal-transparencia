'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, CalendarClock, Loader2, LogOut, Play, RefreshCw, Stethoscope } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { formatarDataHora, formatarDuracao } from '@/lib/backup/format'

interface Log {
  id: string
  modulo: string
  exercicio: number | null
  origem: string
  status: string
  recebidos: number
  inseridos: number
  atualizados: number
  removidos: number
  erros: number
  mensagemErro: string | null
  iniciadoEm: string
  duracaoMs: number | null
}

interface Estado {
  executando: boolean
  iniciadoEm: string | null
  modulos: string[]
  agendador: {
    ativo: boolean
    horarios: string[]
    anosHistoricos: number[]
    proximaExecucao: string | null
    exerciciosDaProxima: number[]
  }
  resumo: Log[]
  logs: Log[]
}

interface Saude {
  verificadoEm: string
  listagens: Array<{
    modulo: string
    listagem: string
    sincronizada: boolean
    ok: boolean
    status: number | null
    registros: number | null
    duracaoMs: number
    erro: string | null
  }>
}

const NOMES_MODULOS: Record<string, string> = {
  despesas: 'Despesas',
  receitas: 'Receitas',
  licitacoes: 'Licitações',
  contratos: 'Contratos',
  diarias: 'Diárias',
  transferencias: 'Transferências',
}

const CORES_STATUS: Record<string, string> = {
  SUCESSO: 'bg-emerald-100 text-emerald-800',
  DIVERGENTE: 'bg-amber-100 text-amber-800',
  IGNORADO: 'bg-slate-100 text-slate-700',
  ERRO: 'bg-red-100 text-red-700',
  EXECUTANDO: 'bg-blue-100 text-blue-800',
  INTERROMPIDO: 'bg-orange-100 text-orange-800',
}

function Situacao({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${CORES_STATUS[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {status}
    </span>
  )
}

function Numeros({ log }: { log: Log }) {
  return (
    <span className="whitespace-nowrap text-slate-600">
      {log.recebidos} recebidos · +{log.inseridos} / ~{log.atualizados} / −{log.removidos}
      {log.erros > 0 && <span className="text-amber-700"> · {log.erros} descartados</span>}
    </span>
  )
}

function Mensagem({ texto }: { texto: string | null }) {
  if (!texto) return null
  const linhas = texto.split('\n')
  if (linhas.length === 1) return <p className="mt-1 text-xs text-slate-600">{texto}</p>
  return (
    <details className="mt-1 text-xs text-slate-600">
      <summary className="cursor-pointer">{linhas[0]} (+{linhas.length - 1})</summary>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {linhas.slice(1).map((linha, i) => <li key={i}>{linha}</li>)}
      </ul>
    </details>
  )
}

export function SincronizacaoDashboard() {
  const router = useRouter()
  const [estado, setEstado] = useState<Estado | null>(null)
  const [saude, setSaude] = useState<Saude | null>(null)
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [modulos, setModulos] = useState<string[]>([])
  const [exercicios, setExercicios] = useState('')
  const [testando, setTestando] = useState(false)
  const [disparando, setDisparando] = useState(false)

  const carregar = useCallback(async () => {
    try {
      const resposta = await fetch('/api/admin/fiorilli/sync', { cache: 'no-store' })
      if (resposta.status === 401) {
        router.replace('/admin/login?retorno=/admin/sincronizacao')
        return
      }
      const corpo = (await resposta.json()) as Estado & { error?: string }
      if (!resposta.ok) {
        setAviso({ tipo: 'erro', texto: corpo.error ?? 'Falha ao carregar o status.' })
        return
      }
      setEstado(corpo)
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha de rede ao consultar o servidor.' })
    }
  }, [router])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Enquanto houver sincronizacao rodando, atualiza sozinho.
  useEffect(() => {
    if (!estado?.executando) return
    const timer = setInterval(() => void carregar(), 5000)
    return () => clearInterval(timer)
  }, [estado?.executando, carregar])

  async function sincronizar() {
    setDisparando(true)
    setAviso(null)
    const anos = exercicios.split(',').map((a) => Number(a.trim())).filter((a) => Number.isInteger(a) && a > 0)
    try {
      const resposta = await fetch('/api/admin/fiorilli/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modulos: modulos.length ? modulos : undefined, exercicios: anos.length ? anos : undefined }),
      })
      const corpo = (await resposta.json()) as { error?: string }
      setAviso(resposta.ok
        ? { tipo: 'ok', texto: 'Sincronização iniciada. O andamento aparece no histórico abaixo.' }
        : { tipo: 'erro', texto: corpo.error ?? 'Não foi possível iniciar a sincronização.' })
      await carregar()
    } finally {
      setDisparando(false)
    }
  }

  async function testarApi() {
    setTestando(true)
    try {
      const resposta = await fetch('/api/admin/fiorilli/saude', { cache: 'no-store' })
      if (resposta.ok) setSaude((await resposta.json()) as Saude)
      else setAviso({ tipo: 'erro', texto: 'Falha ao testar a API.' })
    } finally {
      setTestando(false)
    }
  }

  async function sair() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  if (!estado) {
    return (
      <p className="flex items-center gap-2 p-8 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando painel...
      </p>
    )
  }

  const problemas = estado.resumo.filter((r) => r.status === 'ERRO' || r.status === 'DIVERGENTE')

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sincronização com a Fiorilli</h1>
          <p className="text-sm text-slate-600">
            Carga dos dados do sistema contábil (SCPI) para o portal e conferência com os totais oficiais.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/backup">Backup</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => void carregar()}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={sair}>
            <LogOut className="h-4 w-4" aria-hidden /> Sair
          </Button>
        </div>
      </header>

      {aviso && (
        <p role="status" className={`rounded-md px-4 py-3 text-sm ${aviso.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {aviso.texto}
        </p>
      )}

      {estado.executando && (
        <p className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Sincronização em andamento desde {formatarDataHora(estado.iniciadoEm)}.
        </p>
      )}

      {problemas.length > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {problemas.length} carga(s) com problema na última execução:{' '}
          {problemas.map((p) => `${NOMES_MODULOS[p.modulo] ?? p.modulo} ${p.exercicio}`).join(', ')}.
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-emerald-700" aria-hidden /> Agendamento
            </CardTitle>
            <CardDescription>Definido pelas variáveis FIORILLI_SYNC_* do servidor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-slate-700">
            {estado.agendador.ativo ? (
              <>
                <p>Todo dia às <strong>{estado.agendador.horarios.join(', ')}</strong> (Manaus), exercício corrente.</p>
                <p>
                  Aos domingos, na execução das {estado.agendador.horarios[0]}, também:{' '}
                  {estado.agendador.anosHistoricos.length ? estado.agendador.anosHistoricos.join(', ') : 'nenhum ano histórico configurado'}.
                </p>
                <p>
                  Próxima execução: {formatarDataHora(estado.agendador.proximaExecucao)} ({estado.agendador.exerciciosDaProxima.join(', ')}).
                </p>
              </>
            ) : (
              <p>Desligado. Defina <code>FIORILLI_SYNC_ENABLED=true</code> para sincronizar automaticamente.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5 text-emerald-700" aria-hidden /> Sincronizar agora
            </CardTitle>
            <CardDescription>Sem seleção, sincroniza todos os módulos do exercício corrente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-3">
              {estado.modulos.map((m) => (
                <label key={m} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={modulos.includes(m)}
                    onChange={(e) => setModulos((atual) => (e.target.checked ? [...atual, m] : atual.filter((x) => x !== m)))}
                  />
                  {NOMES_MODULOS[m] ?? m}
                </label>
              ))}
            </div>
            <Input
              placeholder="Exercícios (ex.: 2024, 2025)"
              value={exercicios}
              onChange={(e) => setExercicios(e.target.value)}
              aria-label="Exercícios"
            />
            <Button onClick={() => void sincronizar()} disabled={disparando || estado.executando}>
              {disparando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              Sincronizar
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-700" aria-hidden /> Última carga de cada módulo
          </CardTitle>
          <CardDescription>
            DIVERGENTE: os valores gravados não bateram com os totais oficiais. IGNORADO: a API não tem o dado
            (ex.: receitas de anos anteriores).
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {estado.resumo.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma sincronização feita ainda.</p>
          ) : (
            <table className="w-full min-w-[48rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Exercício</th>
                  <th className="py-2 pr-3">Módulo</th>
                  <th className="py-2 pr-3">Situação</th>
                  <th className="py-2 pr-3">Registros</th>
                  <th className="py-2 pr-3">Quando</th>
                  <th className="py-2 pr-3">Duração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {estado.resumo.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 pr-3">{r.exercicio}</td>
                    <td className="py-2 pr-3">{NOMES_MODULOS[r.modulo] ?? r.modulo}</td>
                    <td className="py-2 pr-3"><Situacao status={r.status} /><Mensagem texto={r.mensagemErro} /></td>
                    <td className="py-2 pr-3"><Numeros log={r} /></td>
                    <td className="py-2 pr-3 whitespace-nowrap">{formatarDataHora(r.iniciadoEm)}</td>
                    <td className="py-2 pr-3">{formatarDuracao(r.duracaoMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-emerald-700" aria-hidden /> Disponibilidade da API
          </CardTitle>
          <CardDescription>Consulta pequena (mês corrente) em cada listagem, sem novas tentativas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 overflow-x-auto">
          <Button variant="outline" size="sm" onClick={() => void testarApi()} disabled={testando}>
            {testando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Stethoscope className="h-4 w-4" aria-hidden />}
            Testar agora
          </Button>
          {saude && (
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3">Listagem</th>
                  <th className="py-2 pr-3">Situação</th>
                  <th className="py-2 pr-3">Registros</th>
                  <th className="py-2 pr-3">Tempo</th>
                  <th className="py-2 pr-3">Observação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {saude.listagens.map((l) => (
                  <tr key={l.listagem}>
                    <td className="py-2 pr-3">{l.modulo} / {l.listagem}</td>
                    <td className="py-2 pr-3"><Situacao status={l.ok ? 'SUCESSO' : 'ERRO'} /></td>
                    <td className="py-2 pr-3">{l.registros ?? '—'}</td>
                    <td className="py-2 pr-3">{formatarDuracao(l.duracaoMs)}</td>
                    <td className="py-2 pr-3 text-xs text-slate-600">
                      {l.erro ?? ''}
                      {!l.sincronizada && ' Ainda não sincronizada pelo portal.'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Últimas 50 cargas, da mais recente para a mais antiga.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Quando</th>
                <th className="py-2 pr-3">Módulo</th>
                <th className="py-2 pr-3">Origem</th>
                <th className="py-2 pr-3">Situação</th>
                <th className="py-2 pr-3">Registros</th>
                <th className="py-2 pr-3">Duração</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {estado.logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatarDataHora(log.iniciadoEm)}</td>
                  <td className="py-2 pr-3">{NOMES_MODULOS[log.modulo] ?? log.modulo} {log.exercicio}</td>
                  <td className="py-2 pr-3">{log.origem}</td>
                  <td className="py-2 pr-3"><Situacao status={log.status} /><Mensagem texto={log.mensagemErro} /></td>
                  <td className="py-2 pr-3"><Numeros log={log} /></td>
                  <td className="py-2 pr-3">{formatarDuracao(log.duracaoMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
