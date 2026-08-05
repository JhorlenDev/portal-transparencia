'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Database,
  Download,
  HardDrive,
  Loader2,
  LogOut,
  Play,
  RefreshCw,
  Trash2,
  Unplug,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DriveFolderPicker } from '@/components/admin/drive-folder-picker'
import { DIAS_SEMANA, formatarBytes, formatarDataHora, formatarDuracao } from '@/lib/backup/format'

interface ConfigBackup {
  id: string
  incluirBanco: boolean
  incluirMidias: boolean
  pularDuplicados: boolean
  localAtivo: boolean
  localModo: string
  localIntervaloHoras: number
  localHorarios: string
  localDiasSemana: string
  localRetencaoQtd: number
  localRetencaoDias: number
  nuvemAtivo: boolean
  nuvemModo: string
  nuvemIntervaloHoras: number
  nuvemHorarios: string
  nuvemDiasSemana: string
  nuvemRetencaoQtd: number
  nuvemRetencaoDias: number
  driveFolderId: string | null
  driveFolderNome: string | null
}

interface Job {
  id: string
  tipo: string
  origem: string
  escopo: string
  status: string
  arquivo: string | null
  tamanhoBytes: number | null
  sha256: string | null
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

interface Status {
  config: ConfigBackup
  fuso: string
  agendadorAtivo: boolean
  diretorio: string | null
  erroDiretorio: string | null
  espacoLivre: number | null
  pastasMidia: string[]
  emAndamento: Job[]
  ultimoLocal: Job | null
  ultimoNuvem: Job | null
  proximaLocal: string | null
  proximaNuvem: string | null
  drive:
    | { conectado: false }
    | {
        conectado: true
        email: string
        escopo: string | null
        conectadoEm: string
        ultimoUsoEm: string | null
        ultimoErro: string | null
        quotaTotal: number | null
        quotaUsada: number | null
      }
}

type Aviso = { tipo: 'ok' | 'erro'; texto: string } | null

const MODOS = [
  { valor: 'INTERVALO', rotulo: 'A cada N horas' },
  { valor: 'DIARIO', rotulo: 'Em horários fixos do dia' },
  { valor: 'SEMANAL', rotulo: 'Em dias da semana' },
]

export function BackupDashboard() {
  const router = useRouter()
  const params = useSearchParams()

  const [status, setStatus] = useState<Status | null>(null)
  const [config, setConfig] = useState<ConfigBackup | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [executando, setExecutando] = useState(false)
  const [aviso, setAviso] = useState<Aviso>(null)
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [jobDetalhe, setJobDetalhe] = useState<Job | null>(null)
  const [escopoManual, setEscopoManual] = useState('COMPLETO')
  const [destinoManual, setDestinoManual] = useState('LOCAL')
  const [acaoEmCurso, setAcaoEmCurso] = useState<string | null>(null)

  const emAndamento = (status?.emAndamento.length ?? 0) > 0

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true)

    try {
      const [respostaStatus, respostaJobs] = await Promise.all([
        fetch('/api/admin/backup/status', { cache: 'no-store' }),
        fetch('/api/admin/backup/jobs?limite=40', { cache: 'no-store' }),
      ])

      if (respostaStatus.status === 401) {
        router.replace('/admin/login')
        return
      }

      const corpoStatus = (await respostaStatus.json()) as Status & { error?: string }
      if (!respostaStatus.ok) {
        setAviso({ tipo: 'erro', texto: corpoStatus.error ?? 'Falha ao carregar o status.' })
        return
      }

      setStatus(corpoStatus)
      setConfig((anterior) => (anterior && !silencioso ? anterior : corpoStatus.config))

      const corpoJobs = (await respostaJobs.json()) as { jobs?: Job[] }
      setJobs(corpoJobs.jobs ?? [])
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha de rede ao consultar o servidor.' })
    } finally {
      setCarregando(false)
    }
  }, [router])

  useEffect(() => {
    void carregar()
  }, [carregar])

  // Enquanto houver backup rodando, atualiza sozinho.
  useEffect(() => {
    if (!emAndamento) return
    const timer = setInterval(() => void carregar(true), 3000)
    return () => clearInterval(timer)
  }, [emAndamento, carregar])

  useEffect(() => {
    const resultado = params.get('drive')
    if (!resultado) return

    if (resultado === 'ok') {
      setAviso({ tipo: 'ok', texto: `Google Drive conectado${params.get('conta') ? ` (${params.get('conta')})` : ''}.` })
    } else {
      setAviso({ tipo: 'erro', texto: params.get('msg') ?? 'Não foi possível conectar o Google Drive.' })
    }

    router.replace('/admin/backup')
  }, [params, router])

  const alterar = useCallback(<C extends keyof ConfigBackup>(campo: C, valor: ConfigBackup[C]) => {
    setConfig((anterior) => (anterior ? { ...anterior, [campo]: valor } : anterior))
  }, [])

  async function salvar() {
    if (!config) return
    setSalvando(true)
    setAviso(null)

    try {
      const resposta = await fetch('/api/admin/backup/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const corpo = (await resposta.json()) as ConfigBackup & { error?: string }

      if (!resposta.ok) {
        setAviso({ tipo: 'erro', texto: corpo.error ?? 'Não foi possível salvar.' })
        return
      }

      setConfig(corpo)
      setAviso({ tipo: 'ok', texto: 'Configurações salvas.' })
      void carregar(true)
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha de rede ao salvar.' })
    } finally {
      setSalvando(false)
    }
  }

  async function executarAgora() {
    setExecutando(true)
    setAviso(null)

    try {
      const resposta = await fetch('/api/admin/backup/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ escopo: escopoManual, destino: destinoManual }),
      })
      const corpo = (await resposta.json()) as { error?: string }

      if (!resposta.ok) {
        setAviso({ tipo: 'erro', texto: corpo.error ?? 'Não foi possível iniciar o backup.' })
        return
      }

      setAviso({ tipo: 'ok', texto: 'Backup iniciado. O histórico atualiza sozinho.' })
      void carregar(true)
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha de rede ao iniciar o backup.' })
    } finally {
      setExecutando(false)
    }
  }

  async function acaoNoJob(job: Job, acao: 'push' | 'pull' | 'excluir') {
    setAcaoEmCurso(`${job.id}:${acao}`)
    setAviso(null)

    try {
      const url =
        acao === 'excluir'
          ? `/api/admin/backup/jobs/${job.id}${job.driveFileId ? '?drive=1' : ''}`
          : `/api/admin/backup/jobs/${job.id}/${acao}`

      const resposta = await fetch(url, { method: acao === 'excluir' ? 'DELETE' : 'POST' })
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: string }

      if (!resposta.ok) {
        setAviso({ tipo: 'erro', texto: corpo.error ?? 'A operação falhou.' })
        return
      }

      const mensagens = {
        push: 'Backup enviado para o Google Drive.',
        pull: 'Backup trazido do Google Drive para o servidor.',
        excluir: 'Backup excluído.',
      }
      setAviso({ tipo: 'ok', texto: mensagens[acao] })
      await carregar(true)
    } catch {
      setAviso({ tipo: 'erro', texto: 'Falha de rede na operação.' })
    } finally {
      setAcaoEmCurso(null)
    }
  }

  async function desconectarDrive() {
    if (!confirm('Desconectar o Google Drive? Os backups já enviados continuam lá.')) return

    setAcaoEmCurso('drive:revoke')
    try {
      await fetch('/api/admin/backup/drive/revoke', { method: 'POST' })
      setAviso({ tipo: 'ok', texto: 'Google Drive desconectado.' })
      await carregar(true)
    } finally {
      setAcaoEmCurso(null)
    }
  }

  async function sair() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
  }

  const fuso = status?.fuso ?? 'America/Manaus'
  const driveConectado = status?.drive.conectado === true

  const resumoConteudo = useMemo(() => {
    if (!config) return ''
    const partes: string[] = []
    if (config.incluirBanco) partes.push('banco de dados')
    if (config.incluirMidias) partes.push('mídias')
    return partes.join(' + ') || 'nada selecionado'
  }, [config])

  if (carregando || !status || !config) {
    return (
      <p className="flex items-center gap-2 p-8 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando painel...
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Backup do portal</h1>
          <p className="text-sm text-slate-600">
            Cópias do {resumoConteudo}. O código-fonte fica versionado no GitHub e não entra aqui.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void carregar()}>
            <RefreshCw className="h-4 w-4" aria-hidden /> Atualizar
          </Button>
          <Button variant="ghost" size="sm" onClick={sair}>
            <LogOut className="h-4 w-4" aria-hidden /> Sair
          </Button>
        </div>
      </header>

      {aviso && (
        <p
          role="status"
          className={`rounded-md px-4 py-3 text-sm ${
            aviso.tipo === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {status.erroDiretorio && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {status.erroDiretorio}
        </p>
      )}

      {emAndamento && (
        <p className="flex items-center gap-2 rounded-md bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Backup em andamento ({status.emAndamento.map((j) => j.tipo.toLowerCase()).join(' e ')})...
        </p>
      )}

      {/* ---------------------------------------------------------- Google Drive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5 text-emerald-700" aria-hidden /> Google Drive
          </CardTitle>
          <CardDescription>
            A conexão é feita pelo BackupHub, que só autentica: os arquivos vão do servidor direto para o
            Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.drive.conectado ? (
            <>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span className="flex items-center gap-2 font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" aria-hidden /> {status.drive.email}
                </span>
                <span className="text-slate-600">
                  Conectado em {formatarDataHora(status.drive.conectadoEm, fuso)}
                </span>
                {status.drive.quotaTotal !== null && (
                  <span className="text-slate-600">
                    Espaço: {formatarBytes(status.drive.quotaUsada)} de {formatarBytes(status.drive.quotaTotal)}
                  </span>
                )}
              </div>

              {status.drive.ultimoErro && (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{status.drive.ultimoErro}</p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-700">
                  Pasta de destino:{' '}
                  <strong>{config.driveFolderNome ?? 'nenhuma escolhida'}</strong>
                </span>
                <Button variant="outline" size="sm" onClick={() => setSeletorAberto(true)}>
                  Escolher pasta
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={desconectarDrive}
                  disabled={acaoEmCurso === 'drive:revoke'}
                >
                  <Unplug className="h-4 w-4" aria-hidden /> Desconectar
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Nenhuma conta conectada. Escolha como quer autorizar:
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <a href="/api/admin/backup/drive/connect?app_folder=0">Conectar (Drive completo)</a>
                </Button>
                <Button asChild variant="outline">
                  <a href="/api/admin/backup/drive/connect?app_folder=1">Conectar (só a pasta do app)</a>
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                “Drive completo” permite escolher qualquer pasta, mas o Google mostra o aviso de app não
                verificado. “Só a pasta do app” evita o aviso e grava apenas em uma pasta criada pelo sistema.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- Conteúdo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-700" aria-hidden /> O que entra no backup
          </CardTitle>
          <CardDescription>
            Mídias em: {status.pastasMidia.join(', ') || 'nenhuma pasta encontrada'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Marcador
            id="incluirBanco"
            rotulo="Banco de dados (dump SQL completo)"
            valor={config.incluirBanco}
            onChange={(v) => alterar('incluirBanco', v)}
          />
          <Marcador
            id="incluirMidias"
            rotulo="Mídias enviadas (anexos, logos e uploads)"
            valor={config.incluirMidias}
            onChange={(v) => alterar('incluirMidias', v)}
          />
          <Marcador
            id="pularDuplicados"
            rotulo="Não gerar pacote novo quando nada mudou desde o último backup"
            valor={config.pularDuplicados}
            onChange={(v) => alterar('pularDuplicados', v)}
          />
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- Agendamentos */}
      <div className="grid gap-6 lg:grid-cols-2">
        <CartaoAgenda
          titulo="Backup local (no servidor)"
          icone={<HardDrive className="h-5 w-5 text-emerald-700" aria-hidden />}
          descricao={
            status.diretorio
              ? `Pasta: ${status.diretorio}${
                  status.espacoLivre !== null ? ` · ${formatarBytes(status.espacoLivre)} livres` : ''
                }`
              : 'Pasta de backups indisponível'
          }
          prefixo="local"
          config={config}
          alterar={alterar}
          proxima={status.proximaLocal}
          ultima={status.ultimoLocal}
          fuso={fuso}
        />

        <CartaoAgenda
          titulo="Backup na nuvem (Google Drive)"
          icone={<CloudUpload className="h-5 w-5 text-emerald-700" aria-hidden />}
          descricao={
            driveConectado
              ? `Pasta: ${config.driveFolderNome ?? 'nenhuma escolhida'}`
              : 'Conecte uma conta do Google Drive para ativar'
          }
          prefixo="nuvem"
          config={config}
          alterar={alterar}
          proxima={status.proximaNuvem}
          ultima={status.ultimoNuvem}
          fuso={fuso}
          desabilitado={!driveConectado || !config.driveFolderId}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Salvar configurações
        </Button>
        {!status.agendadorAtivo && (
          <span className="text-sm text-amber-700">
            O agendador interno está desligado neste ambiente (BACKUP_SCHEDULER_ENABLED).
          </span>
        )}
      </div>

      {/* ---------------------------------------------------------- Executar agora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-emerald-700" aria-hidden /> Executar agora
          </CardTitle>
          <CardDescription>Roda um backup imediato, sem esperar o agendamento.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <Campo rotulo="Conteúdo">
            <select
              value={escopoManual}
              onChange={(e) => setEscopoManual(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="COMPLETO">Banco + mídias</option>
              <option value="BANCO">Só banco de dados</option>
              <option value="MIDIAS">Só mídias</option>
            </select>
          </Campo>

          <Campo rotulo="Destino">
            <select
              value={destinoManual}
              onChange={(e) => setDestinoManual(e.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="LOCAL">Só no servidor</option>
              <option value="NUVEM" disabled={!driveConectado || !config.driveFolderId}>
                Só no Google Drive
              </option>
              <option value="AMBOS" disabled={!driveConectado || !config.driveFolderId}>
                Servidor + Google Drive
              </option>
            </select>
          </Campo>

          <Button onClick={executarAgora} disabled={executando || emAndamento}>
            {executando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            Fazer backup agora
          </Button>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------- Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
          <CardDescription>Últimas {jobs.length} execuções. Clique em uma linha para ver o log.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhum backup executado ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-3">Quando</th>
                    <th className="py-2 pr-3">Destino</th>
                    <th className="py-2 pr-3">Conteúdo</th>
                    <th className="py-2 pr-3">Situação</th>
                    <th className="py-2 pr-3">Tamanho</th>
                    <th className="py-2 pr-3">Duração</th>
                    <th className="py-2 pr-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-3">
                        <button type="button" className="text-left hover:underline" onClick={() => setJobDetalhe(job)}>
                          {formatarDataHora(job.iniciadoEm, fuso)}
                          <span className="block text-xs text-slate-500">
                            {job.origem === 'AGENDADO' ? 'agendado' : 'manual'}
                          </span>
                        </button>
                      </td>
                      <td className="py-2 pr-3">{job.tipo === 'NUVEM' ? 'Google Drive' : 'Servidor'}</td>
                      <td className="py-2 pr-3">
                        {job.escopo === 'COMPLETO' ? 'Banco + mídias' : job.escopo === 'BANCO' ? 'Banco' : 'Mídias'}
                        {job.totalRegistros !== null && (
                          <span className="block text-xs text-slate-500">
                            {job.totalRegistros} registros
                            {job.totalArquivos !== null ? ` · ${job.totalArquivos} arquivos` : ''}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Situacao status={job.status} />
                      </td>
                      <td className="py-2 pr-3">{formatarBytes(job.tamanhoBytes)}</td>
                      <td className="py-2 pr-3">{formatarDuracao(job.duracaoMs)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center justify-end gap-1">
                          {job.temArquivoLocal && (
                            <a
                              href={`/api/admin/backup/jobs/${job.id}/download`}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
                              title="Baixar pacote"
                            >
                              <Download className="h-4 w-4" aria-hidden />
                            </a>
                          )}
                          {job.temArquivoLocal && driveConectado && config.driveFolderId && job.tipo === 'LOCAL' && (
                            <button
                              type="button"
                              onClick={() => void acaoNoJob(job, 'push')}
                              disabled={acaoEmCurso === `${job.id}:push`}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              title="Enviar para o Google Drive"
                            >
                              <CloudUpload className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          {!job.temArquivoLocal && job.driveFileId && (
                            <button
                              type="button"
                              onClick={() => void acaoNoJob(job, 'pull')}
                              disabled={acaoEmCurso === `${job.id}:pull`}
                              className="rounded p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                              title="Trazer do Google Drive para o servidor"
                            >
                              <Download className="h-4 w-4" aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('Excluir este backup? O arquivo também será apagado.')) {
                                void acaoNoJob(job, 'excluir')
                              }
                            }}
                            disabled={acaoEmCurso === `${job.id}:excluir`}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DriveFolderPicker
        aberto={seletorAberto}
        onFechar={() => setSeletorAberto(false)}
        onEscolher={(pasta) => {
          setSeletorAberto(false)
          setConfig((anterior) =>
            anterior ? { ...anterior, driveFolderId: pasta.id, driveFolderNome: pasta.nome } : anterior
          )
          setAviso({ tipo: 'ok', texto: `Pasta “${pasta.nome}” selecionada. Salve as configurações para aplicar.` })
        }}
      />

      <Dialog open={jobDetalhe !== null} onOpenChange={(estado) => !estado && setJobDetalhe(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhes do backup</DialogTitle>
          </DialogHeader>
          {jobDetalhe && (
            <div className="space-y-3 text-sm">
              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Detalhe rotulo="Arquivo" valor={jobDetalhe.arquivo ?? '—'} />
                <Detalhe rotulo="Situação" valor={jobDetalhe.status} />
                <Detalhe rotulo="Tamanho" valor={formatarBytes(jobDetalhe.tamanhoBytes)} />
                <Detalhe rotulo="Duração" valor={formatarDuracao(jobDetalhe.duracaoMs)} />
                <Detalhe rotulo="Tabelas" valor={String(jobDetalhe.totalTabelas ?? '—')} />
                <Detalhe rotulo="Arquivos" valor={String(jobDetalhe.totalArquivos ?? '—')} />
              </dl>

              {jobDetalhe.sha256 && (
                <p className="break-all text-xs text-slate-500">sha256: {jobDetalhe.sha256}</p>
              )}

              {jobDetalhe.erro && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-red-700">{jobDetalhe.erro}</p>
              )}

              <pre className="max-h-72 overflow-auto rounded-md bg-slate-900 p-3 text-xs text-slate-100">
                {jobDetalhe.log ?? 'Sem log.'}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Detalhe({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</dt>
      <dd className="break-words text-slate-800">{valor}</dd>
    </div>
  )
}

function Situacao({ status }: { status: string }) {
  const estilos: Record<string, string> = {
    SUCESSO: 'bg-emerald-50 text-emerald-800',
    DUPLICADO: 'bg-slate-100 text-slate-700',
    ERRO: 'bg-red-50 text-red-700',
    EXECUTANDO: 'bg-blue-50 text-blue-800',
  }
  const rotulos: Record<string, string> = {
    SUCESSO: 'concluído',
    DUPLICADO: 'sem mudanças',
    ERRO: 'erro',
    EXECUTANDO: 'executando',
  }

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${estilos[status] ?? 'bg-slate-100'}`}>
      {rotulos[status] ?? status.toLowerCase()}
    </span>
  )
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-slate-700">{rotulo}</span>
      {children}
    </label>
  )
}

function Marcador({
  id,
  rotulo,
  valor,
  onChange,
  desabilitado,
}: {
  id: string
  rotulo: string
  valor: boolean
  onChange: (valor: boolean) => void
  desabilitado?: boolean
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-slate-700">
      <input
        id={id}
        type="checkbox"
        checked={valor}
        disabled={desabilitado}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
      />
      <span>{rotulo}</span>
    </label>
  )
}

interface CartaoAgendaProps {
  titulo: string
  icone: React.ReactNode
  descricao: string
  prefixo: 'local' | 'nuvem'
  config: ConfigBackup
  alterar: <C extends keyof ConfigBackup>(campo: C, valor: ConfigBackup[C]) => void
  proxima: string | null
  ultima: Job | null
  fuso: string
  desabilitado?: boolean
}

function CartaoAgenda({
  titulo,
  icone,
  descricao,
  prefixo,
  config,
  alterar,
  proxima,
  ultima,
  fuso,
  desabilitado,
}: CartaoAgendaProps) {
  const ativo = prefixo === 'local' ? config.localAtivo : config.nuvemAtivo
  const modo = prefixo === 'local' ? config.localModo : config.nuvemModo
  const intervalo = prefixo === 'local' ? config.localIntervaloHoras : config.nuvemIntervaloHoras
  const horarios = prefixo === 'local' ? config.localHorarios : config.nuvemHorarios
  const dias = prefixo === 'local' ? config.localDiasSemana : config.nuvemDiasSemana
  const retencaoQtd = prefixo === 'local' ? config.localRetencaoQtd : config.nuvemRetencaoQtd
  const retencaoDias = prefixo === 'local' ? config.localRetencaoDias : config.nuvemRetencaoDias

  const campo = (sufixo: string) => `${prefixo}${sufixo}` as keyof ConfigBackup

  const diasSelecionados = new Set(
    dias
      .split(',')
      .map((d) => Number(d.trim()))
      .filter((d) => Number.isInteger(d))
  )

  function alternarDia(dia: number) {
    const novo = new Set(diasSelecionados)
    if (novo.has(dia)) novo.delete(dia)
    else novo.add(dia)
    const lista = [...novo].sort((a, b) => a - b).join(',')
    alterar(campo('DiasSemana'), (lista || String(dia)) as never)
  }

  return (
    <Card className={desabilitado ? 'opacity-70' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icone} {titulo}</CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Marcador
          id={`${prefixo}-ativo`}
          rotulo="Backup automático ativado"
          valor={ativo}
          desabilitado={desabilitado}
          onChange={(v) => alterar(campo('Ativo'), v as never)}
        />

        <Campo rotulo="Frequência">
          <select
            value={modo}
            disabled={desabilitado}
            onChange={(e) => alterar(campo('Modo'), e.target.value as never)}
            className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {MODOS.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        {modo === 'INTERVALO' && (
          <Campo rotulo="Intervalo (horas)">
            <Input
              type="number"
              min={1}
              max={720}
              value={intervalo}
              disabled={desabilitado}
              onChange={(e) => alterar(campo('IntervaloHoras'), Number(e.target.value) as never)}
              className="w-32"
            />
          </Campo>
        )}

        {(modo === 'DIARIO' || modo === 'SEMANAL') && (
          <Campo rotulo="Horários (separe por vírgula, ex.: 03:00,15:00)">
            <Input
              value={horarios}
              disabled={desabilitado}
              onChange={(e) => alterar(campo('Horarios'), e.target.value as never)}
              placeholder="03:00,15:00"
            />
          </Campo>
        )}

        {modo === 'SEMANAL' && (
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Dias da semana</span>
            <div className="flex flex-wrap gap-1">
              {DIAS_SEMANA.map((dia) => (
                <button
                  key={dia.valor}
                  type="button"
                  disabled={desabilitado}
                  onClick={() => alternarDia(dia.valor)}
                  className={`rounded-md border px-3 py-1 text-sm ${
                    diasSelecionados.has(dia.valor)
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {dia.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Manter últimos (0 = todos)">
            <Input
              type="number"
              min={0}
              max={1000}
              value={retencaoQtd}
              disabled={desabilitado}
              onChange={(e) => alterar(campo('RetencaoQtd'), Number(e.target.value) as never)}
            />
          </Campo>
          <Campo rotulo="Apagar após (dias, 0 = nunca)">
            <Input
              type="number"
              min={0}
              max={3650}
              value={retencaoDias}
              disabled={desabilitado}
              onChange={(e) => alterar(campo('RetencaoDias'), Number(e.target.value) as never)}
            />
          </Campo>
        </div>

        <dl className="space-y-1 border-t border-slate-100 pt-3 text-xs text-slate-600">
          <div className="flex justify-between gap-2">
            <dt>Último backup</dt>
            <dd>{ultima ? formatarDataHora(ultima.iniciadoEm, fuso) : 'nunca'}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>Próximo previsto</dt>
            <dd>{proxima ? formatarDataHora(proxima, fuso) : ativo ? 'sem horário válido' : 'desativado'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
