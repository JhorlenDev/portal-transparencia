"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Download, ChevronDown } from "lucide-react"
import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface FilterOption {
  value: string
  label: string
}

interface FilterBarProps {
  page: "despesas" | "receitas" | "licitacoes" | "contratos" | "servidores" | "convenios"
  years?: number[]
  categories?: FilterOption[]
  statuses?: FilterOption[]
  searchPlaceholder?: string
  onExport?: (params: URLSearchParams) => void
}

const DEFAULT_YEARS = () => {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 5 }, (_, i) => currentYear - i)
}

export function FilterBar({
  page,
  years = DEFAULT_YEARS(),
  categories = [],
  statuses = [],
  searchPlaceholder = "Buscar...",
  onExport
}: FilterBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const [ano, setAno] = useState(searchParams.get("ano") || years[0]?.toString() || "")
  const [categoria, setCategoria] = useState(searchParams.get("categoria") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "")

  const createQueryString = useCallback((name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(name, value)
    } else {
      params.delete(name)
    }
    return params.toString()
  }, [searchParams])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (ano) params.set("ano", ano)
    if (categoria) params.set("categoria", categoria)
    if (status) params.set("status", status)
    
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (ano) params.set("ano", ano)
    if (categoria) params.set("categoria", categoria)
    if (status) params.set("status", status)
    params.set("export", "csv")
    
    if (onExport) {
      onExport(params)
    } else {
      window.location.href = `/api/export?type=${page}&${params.toString()}`
    }
  }

  const clearFilters = () => {
    setSearch("")
    setAno(years[0]?.toString() || "")
    setCategoria("")
    setStatus("")
    router.push(pathname)
  }

  const hasFilters = search || categoria || status

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          
          <select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
              onChange={(e) => setCategoria(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todas categorias</option>
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
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Todos status</option>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          )}

          <Button onClick={handleSearch} className="bg-emerald-600 hover:bg-emerald-700">
            Filtrar
          </Button>
        </div>

        <div className="flex gap-2">
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters} className="text-slate-600">
              Limpar
            </Button>
          )}
          <Button variant="outline" onClick={handleExport} className="gap-2 text-slate-600">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>
    </div>
  )
}
