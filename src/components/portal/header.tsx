"use client"

import React, { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { Search, Menu, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const menuItems = [
  {
    title: "Receitas",
    href: "/receitas",
  },
  {
    title: "Despesas",
    href: "/despesas",
  },
  {
    title: "Licitações",
    href: "/licitacoes",
  },
  {
    title: "Contratos",
    href: "/contratos",
  },
  {
    title: "Servidores",
    href: "/servidores",
  },
  {
    title: "Convênios",
    href: "/convenios",
  },
  {
    title: "e-SIC",
    href: "/esic",
  },
  {
    title: "Dados Abertos",
    href: "/dados-abertos",
  },
]

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

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/busca?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-lg flex items-center justify-center shadow-md">
              <span className="text-white font-bold text-lg">PT</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-slate-800 leading-tight">
                Portal da Transparência
              </h1>
              <p className="text-xs text-slate-500">Prefeitura Municipal</p>
            </div>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="relative w-full">
              <Input
                type="search"
                placeholder="Buscar despesas, licitações, contratos..."
                className="pr-10 bg-slate-50 border-slate-200 focus:bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Campo de busca"
              />
              <Button
                type="submit"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700"
                aria-label="Buscar"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <nav className="bg-emerald-700 hidden lg:block">
        <div className="container mx-auto px-4">
          <ul className="flex">
            {menuItems.map((item) => (
              <DesktopMenuItem key={item.href} item={item} pathname={pathname} />
            ))}
          </ul>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="lg:hidden border-t p-4 bg-white">
          <form onSubmit={handleSearch} className="mb-4">
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
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>
          <nav className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
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
  )
}
