import type { CSSProperties, ReactNode } from "react"
import Link from "next/link"

export interface ExecutionIndicator {
  label: string
  value: string
  percentage: number
  percentageLabel: string
  color: string
  softColor: string
  icon?: ReactNode
  href?: string
  active?: boolean
}

export function ExecutionIndicators({ title, subtitle, items }: { title: string; subtitle: string; items: ExecutionIndicator[] }) {
  return (
    <section className="mb-5" aria-label={title}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2"><h2 className="text-sm font-bold text-institutional">{title}</h2><p className="text-[11px] text-text-secondary">{subtitle}</p></div>
      <div className={`grid grid-cols-2 gap-3 ${items.length >= 5 ? 'lg:grid-cols-5' : items.length === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
        {items.map((item) => {
          const content = <>
            <div className="flex items-start justify-between gap-2">
              <p className="pr-1 text-[10px] font-bold uppercase leading-4 tracking-[0.06em]" style={{ color: item.color }}>{item.label}</p>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: item.softColor, color: item.color }} aria-hidden="true">{item.icon ?? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />}</span>
            </div>
            <p className="mt-0.5 whitespace-nowrap text-sm font-extrabold tracking-[-0.035em] text-institutional sm:text-[15px]" title={item.value}>{item.value}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="h-1 min-w-10 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label={`${item.label}: ${item.percentageLabel}`} aria-valuenow={Math.min(Math.max(item.percentage, 0), 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full transition-[width]" style={{ width: `${Math.min(Math.max(item.percentage, 0), 100)}%`, backgroundColor: item.color }} />
              </div>
              <span className="whitespace-nowrap text-[10px] font-semibold" style={{ color: item.color }}>{item.percentageLabel}</span>
            </div>
          </>
          const className = `relative overflow-hidden rounded-xl border border-border-subtle bg-white p-2.5 shadow-[0_4px_14px_rgba(18,52,91,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(18,52,91,0.12)] ${item.active ? '-translate-y-px' : ''}`
          const activeStyle = item.active ? {
            background: `linear-gradient(135deg, #ffffff 58%, ${item.softColor} 100%)`,
            boxShadow: `0 10px 26px ${item.color}24`,
          } as CSSProperties : undefined
          return item.href ? <Link key={item.label} href={item.href} aria-pressed={item.active} className={className} style={activeStyle}>{content}</Link> : <div key={item.label} className={className}>{content}</div>
        })}
      </div>
    </section>
  )
}
