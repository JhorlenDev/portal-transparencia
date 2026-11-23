import type { ReactNode } from "react"

interface DataPageHeroProps {
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  accent: "emerald" | "blue" | "purple" | "amber" | "rose" | "cyan" | "indigo"
  badges?: string[]
}

const accentClasses = {
  emerald: "bg-amazon",
  blue: "bg-digital",
  purple: "bg-gold",
  amber: "bg-gold",
  rose: "bg-amazon",
  cyan: "bg-digital",
  indigo: "bg-institutional-hover",
}

export function DataPageHero({ icon, eyebrow, title, description, accent, badges = [] }: DataPageHeroProps) {
  const iconClass = accentClasses[accent]

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-institutional/10 border-t-[3px] border-t-gold bg-institutional text-white shadow-[0_2px_8px_rgba(18,52,91,0.10)]">
      <div className="p-6 md:p-8">
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${iconClass} text-white ring-1 ring-white/20`}>
                {icon}
              </div>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">{eyebrow}</span>
            </div>
            <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80 md:text-base">{description}</p>
          </div>

          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 md:justify-end">
              {badges.map((badge) => (
                <span key={badge} className="rounded-full border border-white/20 bg-white/8 px-3 py-1 text-xs font-medium text-white/90">
                  {badge}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
