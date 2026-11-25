"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ArrowLeftRight, CalendarDays, CloudSun, Database, FileText, HandCoins, Info, Menu, MessageSquare, Plane, Scale, TrendingUp, Users, WalletCards, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const menuItems = [
  { title: "Receitas", href: "/receitas", icon: TrendingUp },
  { title: "Despesas", href: "/despesas", icon: WalletCards },
  { title: "Licitações", href: "/licitacoes", icon: Scale },
  { title: "Contratos", href: "/contratos", icon: FileText },
  { title: "Servidores", href: "/servidores", icon: Users },
  { title: "Convênios", href: "/convenios", icon: HandCoins },
  { title: "Diárias", href: "/diarias", icon: Plane },
  { title: "Transferências", href: "/transferencias", icon: ArrowLeftRight },
  { title: "e-SIC", href: "/esic", icon: MessageSquare },
  { title: "Dados Abertos", href: "/dados-abertos", icon: Database },
]

const WEATHER_URL = "https://api.open-meteo.com/v1/forecast?latitude=-3.35417&longitude=-64.71111&current=temperature_2m,weather_code&timezone=America%2FManaus"

function descricaoClima(codigo: number | undefined) {
  if (codigo === 0) return "Céu limpo"
  if (codigo !== undefined && codigo <= 3) return "Parcialmente nublado"
  if (codigo !== undefined && codigo <= 48) return "Neblina"
  if (codigo !== undefined && codigo <= 67) return "Chuva"
  if (codigo !== undefined && codigo <= 82) return "Pancadas de chuva"
  if (codigo !== undefined && codigo >= 95) return "Trovoadas"
  return "Clima em Tefé"
}

function rotuloUltimaAtualizacao(valor: string | null | undefined): string | null {
  if (!valor) return null

  const fuso = "America/Manaus"
  const instante = new Date(valor)
  const agora = new Date()
  const somenteData = new Intl.DateTimeFormat("pt-BR", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" })
  const dataAtualizacao = somenteData.format(instante)
  const hoje = somenteData.format(agora)
  const ontem = somenteData.format(new Date(agora.getTime() - 24 * 60 * 60 * 1000))
  const hora = instante.toLocaleTimeString("pt-BR", { timeZone: fuso, hour: "2-digit", minute: "2-digit" })

  if (dataAtualizacao === hoje) return `Atualizado hoje às ${hora}`
  if (dataAtualizacao === ontem) return `Atualizado ontem às ${hora}`
  return `Atualizado em ${dataAtualizacao} às ${hora}`
}

function hrefComAno(href: string, ano: string) {
  return ano && !['/esic', '/dados-abertos'].includes(href) ? `${href}?ano=${ano}` : href
}

function DesktopMenuItem({ item, pathname, ano }: { item: (typeof menuItems)[number]; pathname: string; ano: string }) {
  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

  return (
    <li className="border-r border-white/15 last:border-r-0">
      <Link
        href={hrefComAno(item.href, ano)}
        className={`group relative flex h-14 items-center justify-center gap-1.5 px-1.5 text-[11px] font-semibold transition-all xl:gap-2 xl:px-2 xl:text-xs ${
          isActive
            ? "bg-white/12 text-white shadow-[inset_0_-3px_0_#E5B847]"
            : "text-white/85 hover:bg-white/10 hover:text-white"
        }`}
      >
        <item.icon className={`h-4 w-4 shrink-0 transition-transform group-hover:-translate-y-0.5 ${isActive ? "text-gold" : "text-white/70 group-hover:text-gold"}`} aria-hidden="true" />
        <span className="whitespace-nowrap">{item.title}</span>
      </Link>
    </li>
  )
}

interface HeaderProps {
  config?: Record<string, string | null>
  ultimaAtualizacao?: string | null
  horariosAtualizacao?: string
}

export default function Header({ config, ultimaAtualizacao, horariosAtualizacao = "00:00,01:00,02:00,03:00,04:00,05:00,06:00,07:00,08:00,09:00,10:00,11:00,12:00,13:00,14:00,15:00,16:00,17:00,18:00,19:00,20:00,21:00,22:00,23:00" }: HeaderProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [temperatura, setTemperatura] = useState<number | null>(null)
  const [condicao, setCondicao] = useState("Clima em Tefé")
  const [anoPersistido, setAnoPersistido] = useState(searchParams.get('ano') || '')
  const anoGlobal = searchParams.get('ano') || anoPersistido

  const nomeSite = config?.nome_site || "Portal da Transparência"
  const subtitulo = "Prefeitura Municipal de Tefé"
  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date())
  const dataHoje = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)
  const atualizacaoFormatada = rotuloUltimaAtualizacao(ultimaAtualizacao)
  const horariosLegiveis = horariosAtualizacao
    .split(",")
    .map((horario) => horario.trim())
    .filter(Boolean)
    .join(", ")
  const frequenciaAtualizacao = horariosAtualizacao.split(",").filter(Boolean).length === 24
    ? "de hora em hora"
    : `nos horários ${horariosLegiveis}`

  useEffect(() => {
    const controller = new AbortController()

    fetch(WEATHER_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível consultar o clima")
        return response.json() as Promise<{ current?: { temperature_2m?: number; weather_code?: number } }>
      })
      .then((data) => {
        if (typeof data.current?.temperature_2m === "number") {
          setTemperatura(Math.round(data.current.temperature_2m))
        }
        setCondicao(descricaoClima(data.current?.weather_code))
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setCondicao("Clima indisponível")
        }
      })

    return () => controller.abort()
  }, [])

  useEffect(() => {
    const anoDaUrl = searchParams.get('ano') || ''
    if (anoDaUrl) {
      window.localStorage.setItem('portal-ano', anoDaUrl)
    }
  }, [searchParams])

  useEffect(() => {
    const atualizarAno = (event: Event) => setAnoPersistido((event as CustomEvent<string>).detail || '')
    window.addEventListener('portal-ano-alterado', atualizarAno)
    return () => window.removeEventListener('portal-ano-alterado', atualizarAno)
  }, [])

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only shadow-lg focus:fixed focus:left-0 focus:top-0 focus:z-[100] focus:p-4 focus:not-sr-only focus:bg-institutional focus:font-bold focus:text-white"
      >
        Pular para o conteúdo principal
      </a>

      <header className="sticky top-0 z-[60] border-b border-border-subtle bg-white shadow-[0_4px_14px_rgba(18,52,91,0.10)]">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <Link href={hrefComAno("/", anoGlobal)} className="flex min-w-0 items-center gap-3">
              <Image
                src="/logo-portal-transparencia.png"
                alt="Logotipo do Portal da Transparência de Tefé"
                width={784}
                height={803}
                className="h-14 w-auto shrink-0 object-contain sm:h-16"
                priority
              />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-xl font-bold leading-tight text-institutional lg:text-2xl">{nomeSite}</p>
                <p className="mt-0.5 text-sm text-text-secondary">{subtitulo}</p>
              </div>
            </Link>

            <div className="ml-auto flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 border-r border-border-subtle pr-4 text-right lg:flex">
                <div>
                  <p className="text-sm font-semibold text-institutional">{dataHoje}</p>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] font-medium text-text-secondary">
                    <span>{atualizacaoFormatada || "Atualização não informada"}</span>
                    <span className="group relative inline-flex" tabIndex={0} aria-label={`Informações da atualização automática. Os dados são atualizados ${frequenciaAtualizacao}, no horário de Manaus.`}>
                      <Info className="h-3.5 w-3.5 text-digital" aria-hidden="true" />
                      <span role="tooltip" className="pointer-events-none invisible absolute right-0 top-full z-[80] mt-2 w-64 translate-y-1 rounded-lg bg-institutional px-3 py-2 text-left text-[11px] font-normal leading-4 text-white opacity-0 shadow-xl transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus:visible group-focus:translate-y-0 group-focus:opacity-100">
                        Os dados são atualizados automaticamente {frequenciaAtualizacao} pela integração com a Fiorilli, no horário de Manaus.
                      </span>
                    </span>
                  </div>
                </div>
                <CalendarDays className="h-6 w-6 text-digital" aria-hidden="true" />
              </div>

              <div
                className="flex items-center gap-2 px-1 py-2 text-institutional"
                title={`${condicao}${temperatura === null ? "" : `, ${temperatura}°C`}`}
                aria-label={`${condicao} em Tefé${temperatura === null ? "" : `, ${temperatura} graus Celsius`}`}
              >
                <CloudSun className="h-6 w-6 text-gold" aria-hidden="true" />
                <div className="leading-tight">
                  <p className="text-sm font-bold sm:text-base">Tefé {temperatura === null ? "--°" : `${temperatura}°C`}</p>
                  <p className="hidden text-xs text-text-secondary md:block">{condicao}</p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen((open) => !open)}
                aria-expanded={mobileMenuOpen}
                aria-label={mobileMenuOpen ? "Fechar menu principal" : "Abrir menu principal"}
                aria-controls="mobile-menu"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
              </Button>
            </div>
          </div>
        </div>

        <nav className="hidden bg-institutional lg:block" aria-label="Menu principal">
          <div className="container mx-auto px-4">
            <ul className="grid grid-cols-10">
              {menuItems.map((item) => <DesktopMenuItem key={item.href} item={item} pathname={pathname} ano={anoGlobal} />)}
            </ul>
          </div>
        </nav>

        {mobileMenuOpen && (
          <nav id="mobile-menu" className="border-t border-border-subtle bg-white p-4 lg:hidden" aria-label="Menu mobile">
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={hrefComAno(item.href, anoGlobal)}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive ? "bg-blue-50 text-institutional" : "text-text-secondary hover:bg-slate-100 hover:text-institutional"
                    }`}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-digital" : "text-slate-400"}`} aria-hidden="true" />
                    {item.title}
                  </Link>
                )
              })}
            </div>
          </nav>
        )}
      </header>
    </>
  )
}
