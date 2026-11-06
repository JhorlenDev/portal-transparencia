"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, X, Loader2, Download, FileSpreadsheet, FileJson, ChevronDown } from "lucide-react"
import { useState, useEffect, useCallback, useRef, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

interface FilterOption {
  value: string
  label: string
}

/**
 * Filtro especifico de uma pagina, guardado na URL em `param`. Com `options` vira uma lista;
 * sem, um campo de texto aplicado com Enter ou ao sair do campo.
 */
export interface ExtraFilter {
  param: string
  label: string
  options?: FilterOption[]
  placeholder?: string
}

interface FilterBarProps {
  page: "despesas" | "receitas" | "licitacoes" | "contratos" | "servidores" | "convenios" | "diarias" | "transferencias"
  years?: number[]
  categories?: FilterOption[]
  statuses?: FilterOption[]
  extras?: ExtraFilter[]
  searchPlaceholder?: string
  onExport?: (params: URLSearchParams) => void
  isLoading?: boolean
}

const DEFAULT_YEARS = () => {
  const currentYear = new Date().getFullYear()
  return [currentYear]
}

const FORMATOS_EXPORTACAO = [
  { formato: "xlsx", rotulo: "Planilha (XLSX)", icone: FileSpreadsheet },
  { formato: "csv", rotulo: "CSV", icone: FileSpreadsheet },
  { formato: "json", rotulo: "JSON", icone: FileJson },
] as const

const SELECT_CLASS = "px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"

export function FilterBar({
  page,
  years = DEFAULT_YEARS(),
  categories = [],
  statuses = [],
  extras = [],
  searchPlaceholder = "Buscar...",
  onExport,
  isLoading = false
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [ano, setAno] = useState(searchParams.get("ano") || years[0]?.toString() || "")
  const [categoria, setCategoria] = useState(searchParams.get("categoria") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [valoresExtras, setValoresExtras] = useState<Record<string, string>>(() =>
    Object.fromEntries(extras.map((e) => [e.param, searchParams.get(e.param) || ""]))
  )
  const [isFiltering, setIsFiltering] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [menuExportacao, setMenuExportacao] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [isPending, startTransition] = useTransition()

  const applyFilters = useCallback((next?: Partial<{ search: string; ano: string; categoria: string; status: string; extras: Record<string, string> }>) => {
    setIsFiltering(true)
    const params = new URLSearchParams()
    const nextSearch = next?.search ?? search
    const nextAno = next?.ano ?? ano
    const nextCategoria = next?.categoria ?? categoria
    const nextStatus = next?.status ?? status
    const nextExtras = next?.extras ?? valoresExtras

    if (nextSearch && nextSearch.length >= 3) params.set("q", nextSearch)
    if (nextAno) params.set("ano", nextAno)
    if (nextCategoria) params.set("categoria", nextCategoria)
    if (nextStatus) params.set("status", nextStatus)
    for (const [param, valor] of Object.entries(nextExtras)) {
      if (valor.trim()) params.set(param, valor.trim())
    }
    
    const queryString = params.toString()
    startTransition(() => {
      router.push(queryString ? `${pathname}?${queryString}` : pathname)
    })
    setIsFiltering(false)
  }, [search, ano, categoria, status, valoresExtras, pathname, router])

  useEffect(() => {
    if (search.length >= 3) {
      const timeout = setTimeout(() => {
        applyFilters({ search })
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [search, applyFilters])

  useEffect(() => {
    if (!menuExportacao) return
    const fechar = (evento: MouseEvent | KeyboardEvent) => {
      if (evento instanceof KeyboardEvent ? evento.key === "Escape" : !menuRef.current?.contains(evento.target as Node)) {
        setMenuExportacao(false)
      }
    }
    document.addEventListener("mousedown", fechar)
    document.addEventListener("keydown", fechar)
    return () => {
      document.removeEventListener("mousedown", fechar)
      document.removeEventListener("keydown", fechar)
    }
  }, [menuExportacao])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    // Busca apagada: volta a listagem sem o termo anterior.
    if (e.target.value === "" && searchParams.get("q")) applyFilters({ search: "" })
  }

  const handleAnoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setAno(e.target.value)
    const params = new URLSearchParams(searchParams.toString())
    if (e.target.value) {
      params.set("ano", e.target.value)
    } else {
      params.delete("ano")
    }
    params.delete("q")
    params.delete("categoria")
    params.delete("status")
    params.delete("page")
    // As opcoes dos filtros extras (ex.: orgaos) mudam de um ano para outro.
    for (const extra of extras) params.delete(extra.param)
    setValoresExtras(Object.fromEntries(extras.map((e) => [e.param, ""])))
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCategoria = e.target.value
    setCategoria(nextCategoria)
    applyFilters({ categoria: nextCategoria })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value
    setStatus(nextStatus)
    applyFilters({ status: nextStatus })
  }

  const alterarExtra = (param: string, valor: string, aplicar: boolean) => {
    const proximos = { ...valoresExtras, [param]: valor }
    setValoresExtras(proximos)
    if (aplicar) applyFilters({ extras: proximos })
  }

  const aplicarTextoExtra = (param: string) => {
    if ((valoresExtras[param] || "").trim() !== (searchParams.get(param) || "")) applyFilters()
  }

  const clearFilters = () => {
    setShowClearConfirm(false)
    setSearch("")
    setAno(years[0]?.toString() || "")
    setCategoria("")
    setStatus("")
    setValoresExtras(Object.fromEntries(extras.map((e) => [e.param, ""])))
    startTransition(() => {
      router.push(pathname)
    })
  }

  const handleExport = (formato: string) => {
    setMenuExportacao(false)
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (ano) params.set("ano", ano)
    if (categoria) params.set("categoria", categoria)
    if (status) params.set("status", status)
    for (const [param, valor] of Object.entries(valoresExtras)) {
      if (valor.trim()) params.set(param, valor.trim())
    }
    params.set("format", formato)
    
    if (onExport) {
      onExport(params)
    } else {
      window.location.assign(`/api/export?type=${page}&${params.toString()}`)
    }
  }

  const hasFilters = search || categoria || status || Object.values(valoresExtras).some((v) => v.trim())

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
              />
              {(isFiltering || isPending || isLoading) && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-800 animate-spin" />
              )}
            </div>

            <select
              value={ano}
              onChange={handleAnoChange}
              aria-label="Selecionar ano"
              className={`${SELECT_CLASS} min-w-[100px]`}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {categories.length > 0 && (
              <select
                value={categoria}
                onChange={handleCategoriaChange}
                aria-label="Selecionar categoria"
                className={`${SELECT_CLASS} min-w-[150px]`}
              >
                <option value="">Categoria</option>
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            )}

            {statuses.length > 0 && (
              <select
                value={status}
                onChange={handleStatusChange}
                aria-label="Selecionar status"
                className={`${SELECT_CLASS} min-w-[150px]`}
              >
                <option value="">Status</option>
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            {extras.map((extra) => extra.options ? (
              <select
                key={extra.param}
                value={valoresExtras[extra.param] || ""}
                onChange={(e) => alterarExtra(extra.param, e.target.value, true)}
                aria-label={extra.label}
                className={`${SELECT_CLASS} min-w-[150px] max-w-full sm:max-w-[16rem]`}
              >
                <option value="">{extra.label}</option>
                {extra.options.map((opcao) => (
                  <option key={opcao.value} value={opcao.value}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            ) : (
              <Input
                key={extra.param}
                type="search"
                value={valoresExtras[extra.param] || ""}
                placeholder={extra.placeholder ?? extra.label}
                aria-label={extra.label}
                onChange={(e) => alterarExtra(extra.param, e.target.value, false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") aplicarTextoExtra(extra.param)
                }}
                onBlur={() => aplicarTextoExtra(extra.param)}
                className="flex-1 min-w-[180px]"
              />
            ))}
          </div>

          <div className="flex gap-2">
            {hasFilters && (
              <Button 
                variant="outline" 
                onClick={() => setShowClearConfirm(true)} 
                className="text-slate-600"
                disabled={isFiltering || isPending || isLoading}
              >
                {(isFiltering || isPending || isLoading) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4 mr-1" />
                )}
                Limpar
              </Button>
            )}
            <div className="relative" ref={menuRef}>
              <Button
                variant="outline"
                onClick={() => setMenuExportacao((aberto) => !aberto)}
                className="gap-2 text-slate-600"
                aria-haspopup="menu"
                aria-expanded={menuExportacao}
              >
                <Download className="h-4 w-4" />
                Baixar
                <ChevronDown className="h-4 w-4" />
              </Button>
              {menuExportacao && (
                <div role="menu" className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <p className="px-3 py-1.5 text-xs text-slate-500">Com os filtros aplicados</p>
                  {FORMATOS_EXPORTACAO.map(({ formato, rotulo, icone: Icone }) => (
                    <button
                      key={formato}
                      role="menuitem"
                      onClick={() => handleExport(formato)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50"
                    >
                      <Icone className="h-4 w-4 text-emerald-700" />
                      {rotulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Limpar Filtros?</DialogTitle>
            <DialogDescription>
              Isso irá remover todos os filtros aplicados e voltar para a listagem padrão do ano atual.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={clearFilters} className="bg-emerald-600 hover:bg-emerald-800">
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface DetailsModalProps {
  open: boolean
  onClose: () => void
  title: string
  description: string
  periodicidade: string
  totalRegistros: number
  ultimaAtualizacao: string
  columns: { campo: string; tipo: string; descricao: string; exemplo: string }[]
  page: string
}

export function DetailsModal({
  open,
  onClose,
  title,
  description,
  periodicidade,
  totalRegistros,
  ultimaAtualizacao,
  columns,
  page
}: DetailsModalProps) {
  const [activeTab, setActiveTab] = useState<"dicionario" | "downloads" | "api">("dicionario")
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (format: 'csv' | 'json') => {
    setIsDownloading(true)
    setTimeout(() => {
      const params = new URLSearchParams({ format })
      window.location.href = `/api/export?type=${page}&${params.toString()}`
      setIsDownloading(false)
    }, 1000)
  }

  const getApiEndpoint = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/api/${page}`
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-sm mt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm text-slate-600 py-3 border-y border-slate-200">
          <span><strong>Atualização:</strong> {periodicidade}</span>
          <span><strong>Registros:</strong> {totalRegistros.toLocaleString('pt-BR')}</span>
          <span><strong>Última:</strong> {ultimaAtualizacao}</span>
        </div>

        <div className="flex gap-1 mt-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("dicionario")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "dicionario" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Dicionário de Dados
          </button>
          <button
            onClick={() => setActiveTab("downloads")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "downloads" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Downloads
          </button>
          <button
            onClick={() => setActiveTab("api")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === "api" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            API
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {activeTab === "dicionario" && (
            <div>
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Campo</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Tipo</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Descrição</th>
                    <th className="text-left px-3 py-2 font-medium text-slate-600">Exemplo</th>
                  </tr>
                </thead>
                <tbody>
                  {columns.map((col, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs text-emerald-800">{col.campo}</td>
                      <td className="px-3 py-2 text-slate-600">{col.tipo}</td>
                      <td className="px-3 py-2 text-slate-700">{col.descricao}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{col.exemplo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "downloads" && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleDownload('csv')}
                disabled={isDownloading}
                className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-10 w-10 text-emerald-800 animate-spin mb-2" />
                ) : (
                  <FileSpreadsheet className="h-10 w-10 text-emerald-800 mb-2" />
                )}
                <span className="font-medium text-slate-700">Download CSV</span>
                <span className="text-xs text-slate-600 mt-1">Planilha editável</span>
              </button>
              <button
                onClick={() => handleDownload('json')}
                disabled={isDownloading}
                className="flex flex-col items-center justify-center p-6 border-2 border-slate-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-colors disabled:opacity-50"
              >
                {isDownloading ? (
                  <Loader2 className="h-10 w-10 text-amber-800 animate-spin mb-2" />
                ) : (
                  <FileJson className="h-10 w-10 text-amber-800 mb-2" />
                )}
                <span className="font-medium text-slate-700">Download JSON</span>
                <span className="text-xs text-slate-600 mt-1">Formato estruturado</span>
              </button>
            </div>
          )}

          {activeTab === "api" && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-lg p-4">
                <p className="text-slate-500 text-xs mb-2">Endpoint</p>
                <code className="text-emerald-400 text-sm font-mono">
                  GET {getApiEndpoint()}
                </code>
              </div>

              <div>
                <p className="text-slate-600 text-sm font-medium mb-2">Parâmetros Supported</p>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li><code className="bg-slate-100 px-1 rounded">ano</code> - Filtrar por ano</li>
                  <li><code className="bg-slate-100 px-1 rounded">limit</code> - Limite de registros</li>
                  <li><code className="bg-slate-100 px-1 rounded">offset</code> - Offset de paginação</li>
                </ul>
              </div>

              <div>
                <p className="text-slate-600 text-sm font-medium mb-2">Exemplo de Resposta</p>
                <pre className="bg-slate-900 text-slate-300 p-4 rounded-lg text-xs overflow-x-auto">
{`{
  "data": [
    {
      "id": "abc123",
      "campo1": "valor1",
      "campo2": "valor2"
    }
  ],
  "meta": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
