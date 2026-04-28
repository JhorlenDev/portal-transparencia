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
  emerald: "from-emerald-700 to-teal-700 text-emerald-50 bg-emerald-500/20 ring-emerald-300/30",
  blue: "from-blue-700 to-sky-700 text-blue-50 bg-blue-500/20 ring-blue-300/30",
  purple: "from-purple-700 to-indigo-700 text-purple-50 bg-purple-500/20 ring-purple-300/30",
  amber: "from-amber-700 to-orange-700 text-amber-50 bg-amber-500/20 ring-amber-300/30",
  rose: "from-rose-700 to-pink-700 text-rose-50 bg-rose-500/20 ring-rose-300/30",
  cyan: "from-cyan-700 to-teal-700 text-cyan-50 bg-cyan-500/20 ring-cyan-300/30",
  indigo: "from-indigo-700 to-slate-800 text-indigo-50 bg-indigo-500/20 ring-indigo-300/30",
}

export function DataPageHero({ icon, eyebrow, title, description, accent, badges = [] }: DataPageHeroProps) {
  const classes = accentClasses[accent]

  return (
    <section className={`mb-6 overflow-hidden rounded-2xl bg-gradient-to-br ${classes.split(" ").slice(0, 2).join(" ")} text-white shadow-sm`}>
      <div className="relative p-6 md:p-8">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${classes.split(" ").slice(2).join(" ")} ring-1`}>
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
                <span key={badge} className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/85 backdrop-blur">
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
