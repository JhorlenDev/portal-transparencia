'use client'

import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, FolderPlus, Folder, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

interface PastaDrive {
  id: string
  nome: string
}

interface Props {
  aberto: boolean
  onFechar: () => void
  onEscolher: (pasta: PastaDrive) => void
}

interface Trilha {
  id: string
  nome: string
}

export function DriveFolderPicker({ aberto, onFechar, onEscolher }: Props) {
  const [trilha, setTrilha] = useState<Trilha[]>([{ id: 'root', nome: 'Meu Drive' }])
  const [pastas, setPastas] = useState<PastaDrive[]>([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [novaPasta, setNovaPasta] = useState('')
  const [criando, setCriando] = useState(false)

  const atual = trilha[trilha.length - 1]

  const carregar = useCallback(async (pastaId: string) => {
    setCarregando(true)
    setErro(null)

    try {
      const resposta = await fetch(`/api/admin/backup/drive/folders?parent=${encodeURIComponent(pastaId)}`)
      const corpo = (await resposta.json()) as { pastas?: PastaDrive[]; error?: string }

      if (!resposta.ok) {
        setErro(corpo.error ?? 'Não foi possível listar as pastas.')
        setPastas([])
        return
      }

      setPastas(corpo.pastas ?? [])
    } catch {
      setErro('Falha de rede ao consultar o Google Drive.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    if (aberto) {
      setTrilha([{ id: 'root', nome: 'Meu Drive' }])
      void carregar('root')
    }
  }, [aberto, carregar])

  function entrar(pasta: PastaDrive) {
    setTrilha((anterior) => [...anterior, pasta])
    void carregar(pasta.id)
  }

  function voltarPara(indice: number) {
    const nova = trilha.slice(0, indice + 1)
    setTrilha(nova)
    void carregar(nova[nova.length - 1].id)
  }

  async function criarPasta() {
    const nome = novaPasta.trim()
    if (!nome) return

    setCriando(true)
    setErro(null)

    try {
      const resposta = await fetch('/api/admin/backup/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, parent: atual.id }),
      })
      const corpo = (await resposta.json()) as PastaDrive & { error?: string }

      if (!resposta.ok) {
        setErro(corpo.error ?? 'Não foi possível criar a pasta.')
        return
      }

      setNovaPasta('')
      setPastas((anterior) => [...anterior, { id: corpo.id, nome: corpo.nome }])
    } catch {
      setErro('Falha de rede ao criar a pasta.')
    } finally {
      setCriando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && onFechar()}>
      <DialogContent className="max-w-2xl" onClose={onFechar}>
        <DialogHeader>
          <DialogTitle>Escolher pasta do Google Drive</DialogTitle>
          <DialogDescription>
            Navegue até a pasta onde os pacotes de backup devem ser gravados.
          </DialogDescription>
        </DialogHeader>

        <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1 text-sm text-slate-600">
          {trilha.map((item, indice) => (
            <span key={`${item.id}-${indice}`} className="flex items-center gap-1">
              {indice > 0 && <ChevronRight className="h-3 w-3 text-slate-400" aria-hidden />}
              <button
                type="button"
                onClick={() => voltarPara(indice)}
                className="rounded px-1 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.nome}
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => void carregar(atual.id)}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-slate-100"
          >
            <RefreshCw className="h-3 w-3" aria-hidden /> Atualizar
          </button>
        </nav>

        <div className="mt-3 max-h-72 min-h-40 overflow-y-auto rounded-md border border-slate-200">
          {carregando ? (
            <p className="flex items-center gap-2 p-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Carregando pastas...
            </p>
          ) : pastas.length === 0 ? (
            <p className="p-4 text-sm text-slate-600">Nenhuma subpasta aqui. Você pode salvar nesta pasta mesmo.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pastas.map((pasta) => (
                <li key={pasta.id}>
                  <button
                    type="button"
                    onClick={() => entrar(pasta)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <Folder className="h-4 w-4 text-emerald-700" aria-hidden />
                    <span className="flex-1 truncate">{pasta.nome}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {erro && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 gap-2">
            <Input
              value={novaPasta}
              onChange={(e) => setNovaPasta(e.target.value)}
              placeholder={`Nova pasta em "${atual.nome}"`}
              aria-label="Nome da nova pasta"
            />
            <Button type="button" variant="outline" onClick={criarPasta} disabled={criando || !novaPasta.trim()}>
              <FolderPlus className="h-4 w-4" aria-hidden />
              Criar
            </Button>
          </div>

          <Button type="button" onClick={() => onEscolher(atual)} disabled={carregando}>
            Usar “{atual.nome}”
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
