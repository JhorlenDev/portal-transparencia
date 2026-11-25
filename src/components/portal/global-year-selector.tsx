"use client"

import { CalendarRange } from "lucide-react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface GlobalYearSelectorProps {
  years: number[]
  value?: number
  className?: string
}

export function GlobalYearSelector({ years, value, className = "" }: GlobalYearSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function selecionar(ano: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (ano) params.set("ano", ano)
    else params.delete("ano")
    params.delete("page")
    window.localStorage.setItem("portal-ano", ano)
    window.dispatchEvent(new CustomEvent("portal-ano-alterado", { detail: ano }))
    router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}`, { scroll: false })
  }

  return (
    <label className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 text-white shadow-sm backdrop-blur-sm ${className}`}>
      <CalendarRange className="h-4 w-4 text-gold" aria-hidden="true" />
      <span className="hidden text-[10px] font-bold uppercase tracking-wide text-white/65 sm:inline">Exercício</span>
      <select
        aria-label="Selecionar exercício global do portal"
        value={value || ""}
        onChange={(event) => selecionar(event.target.value)}
        className="min-w-20 cursor-pointer border-0 bg-transparent text-sm font-extrabold text-white outline-none [&>option]:bg-white [&>option]:text-institutional"
      >
        {years.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
      </select>
    </label>
  )
}
