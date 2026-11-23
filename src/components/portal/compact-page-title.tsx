import type { ReactNode } from "react"

export function CompactPageTitle({ icon, title, description }: { icon: ReactNode; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="portal-page-title-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-digital" aria-hidden="true">{icon}</div>
      <div className="min-w-0">
        <h1 className="whitespace-nowrap text-base font-extrabold text-institutional">{title}</h1>
        {description && <p className="hidden max-w-64 truncate whitespace-nowrap text-xs text-text-secondary 2xl:block">{description}</p>}
      </div>
    </div>
  )
}
