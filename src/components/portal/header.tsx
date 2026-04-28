"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import { Search, Menu, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const menuItems = [
  { title: "Receitas", href: "/receitas" },
  { title: "Despesas", href: "/despesas" },
  { title: "Licitações", href: "/licitacoes" },
  { title: "Contratos", href: "/contratos" },
  { title: "Servidores", href: "/servidores" },
  { title: "Convênios", href: "/convenios" },
  { title: "e-SIC", href: "/esic" },
  { title: "Dados Abertos", href: "/dados-abertos" },
]

interface SearchResultItem {
  id: string
  credorNome?: string | null
  naturezaReceita?: string | null
  categoriaEconomica?: string | null
  numero?: string | null
  ano?: number | null
  contratadoNome?: string | null
  nome?: string | null
  cargo?: string | null
  objeto?: string | null
}

interface SearchResults {
  despesas: SearchResultItem[]
  receitas: SearchResultItem[]
  licitacoes: SearchResultItem[]
  contratos: SearchResultItem[]
  servidores: SearchResultItem[]
}

const emptySearchResults: SearchResults = {
  despesas: [],
  receitas: [],
  licitacoes: [],
  contratos: [],
  servidores: [],
}

function DesktopMenuItem({ item, pathname }: { item: typeof menuItems[0]; pathname: string }) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
  
  return (
    <li>
      <Link
        href={item.href}
        className={`flex items-center h-12 px-4 text-sm font-medium transition-colors ${
          isActive 
            ? "bg-emerald-800 text-white" 
            : "text-white hover:bg-emerald-600"
        }`}
      >
        {item.title}
      </Link>
    </li>
  )
}

export default function Header({ config }: { config?: Record<string, string | null> }) {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null)
      setShowDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(searchQuery)}`)
        if (res.ok) {
          const data = await res.json() as Partial<SearchResults>
          setSearchResults({ ...emptySearchResults, ...data })
          setShowDropdown(true)
        }
      } catch (error) {
        console.error(error)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      setShowDropdown(false)
      router.push(`/busca?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const nomeSite = config?.nome_site || 'Portal da Transparência'
  const subtitulo = config?.subtitulo_site || 'Prefeitura Municipal'

  return (
    <>
      <a 
        href="#conteudo" 
        className="sr-only focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-[100] focus:p-4 focus:bg-emerald-800 focus:text-white focus:font-bold shadow-lg"
      >
        Pular para o conteúdo principal
      </a>
      <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <Image
              src="/logo.webp"
              alt="Logotipo do Portal da Transparência de Tefé"
              width={200}
              height={48}
              className="h-12 w-auto object-contain"
              priority
            />
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                {nomeSite}
              </h1>
              <p className="text-xs text-slate-600">{subtitulo}</p>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex" role="search" ref={dropdownRef}>
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Buscar despesas, licitações, contratos..."
                className="pr-10 bg-slate-50 border-slate-200 focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { if (searchResults) setShowDropdown(true) }}
                aria-label="Campo de busca"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-800"
                aria-label="Buscar"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>

              {showDropdown && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-[80vh] overflow-y-auto z-50">
                  <div className="p-2 space-y-4">
                    {searchResults.despesas?.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-emerald-800 uppercase tracking-wider bg-emerald-50 rounded-md">Despesas</div>
                        <ul className="mt-1 space-y-1">
                          {searchResults.despesas.slice(0, 3).map((d) => (
                            <li key={d.id}>
                              <Link 
                                href={`/despesas?q=${encodeURIComponent(searchQuery)}#record-${d.id}`}
                                onClick={() => setShowDropdown(false)}
                                className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                              >
                                <p className="font-medium text-slate-800 truncate">{d.credorNome || 'Sem credor'}</p>
                                <p className="text-xs text-slate-500 truncate">{d.objeto}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {searchResults.receitas?.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-blue-800 uppercase tracking-wider bg-blue-50 rounded-md">Receitas</div>
                        <ul className="mt-1 space-y-1">
                          {searchResults.receitas.slice(0, 3).map((r) => (
                            <li key={r.id}>
                              <Link 
                                href={`/receitas?q=${encodeURIComponent(searchQuery)}#record-${r.id}`}
                                onClick={() => setShowDropdown(false)}
                                className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                              >
                                <p className="font-medium text-slate-800 truncate">{r.naturezaReceita}</p>
                                <p className="text-xs text-slate-500 truncate">{r.categoriaEconomica}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {searchResults.licitacoes?.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-purple-800 uppercase tracking-wider bg-purple-50 rounded-md">Licitações</div>
                        <ul className="mt-1 space-y-1">
                          {searchResults.licitacoes.slice(0, 3).map((l) => (
                            <li key={l.id}>
                              <Link 
                                href={`/licitacoes?q=${encodeURIComponent(searchQuery)}#record-${l.id}`}
                                onClick={() => setShowDropdown(false)}
                                className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                              >
                                <p className="font-medium text-slate-800 truncate">Nº {l.numero}/{l.ano}</p>
                                <p className="text-xs text-slate-500 truncate">{l.objeto}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {searchResults.contratos?.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-amber-800 uppercase tracking-wider bg-amber-50 rounded-md">Contratos</div>
                        <ul className="mt-1 space-y-1">
                          {searchResults.contratos.slice(0, 3).map((c) => (
                            <li key={c.id}>
                              <Link 
                                href={`/contratos?q=${encodeURIComponent(searchQuery)}#record-${c.id}`}
                                onClick={() => setShowDropdown(false)}
                                className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                              >
                                <p className="font-medium text-slate-800 truncate">{c.contratadoNome}</p>
                                <p className="text-xs text-slate-500 truncate">{c.objeto}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {searchResults.servidores?.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-xs font-semibold text-rose-800 uppercase tracking-wider bg-rose-50 rounded-md">Servidores</div>
                        <ul className="mt-1 space-y-1">
                          {searchResults.servidores.slice(0, 3).map((s) => (
                            <li key={s.id}>
                              <Link 
                                href={`/servidores?q=${encodeURIComponent(searchQuery)}#record-${s.id}`}
                                onClick={() => setShowDropdown(false)}
                                className="block px-3 py-2 rounded-lg hover:bg-slate-50 text-sm transition-colors"
                              >
                                <p className="font-medium text-slate-800 truncate">{s.nome}</p>
                                <p className="text-xs text-slate-500 truncate">{s.cargo}</p>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {Object.values(searchResults).every((arr) => arr.length === 0) && (
                      <div className="p-4 text-center text-sm text-slate-600">
                        Nenhum resultado encontrado para &quot;{searchQuery}&quot;
                      </div>
                    )}

                    {!Object.values(searchResults).every((arr) => arr.length === 0) && (
                      <Link 
                        href={`/busca?q=${encodeURIComponent(searchQuery)}`}
                        onClick={() => setShowDropdown(false)}
                        className="block mt-2 p-3 text-center text-sm font-medium text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        Ver todos os resultados
                      </Link>
                    )}
                  </div>
                </div>
              )}
            </div>
          </form>

          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Fechar menu principal" : "Abrir menu principal"}
            aria-controls="mobile-menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <nav className="bg-emerald-800 hidden lg:block" aria-label="Menu Principal">
        <div className="container mx-auto px-4">
          <ul className="flex">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t p-4 bg-white">
          <form onSubmit={handleSearch} className="mb-4" role="search">
            <div className="relative">
              <Input
                type="search"
                placeholder="Buscar..."
                className="pr-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-emerald-600"
                aria-label="Buscar versão mobile"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
          <nav className="space-y-1" aria-label="Menu Mobile">
            {menuItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="block px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
    </>
  )
}
