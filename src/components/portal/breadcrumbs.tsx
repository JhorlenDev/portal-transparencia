import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const normalizedItems = items.filter((item, index) => !(index === 0 && item.href === "/"))
  return (
    <nav className="flex items-center gap-1 text-sm text-slate-600 mb-4">
      <Link 
        href="/" 
        className="flex items-center gap-1 transition-colors hover:text-digital"
      >
        <Home className="h-4 w-4" />
        <span>Transparência</span>
      </Link>
      
      {normalizedItems.map((item, index) => (
        <span key={index} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-slate-300" />
          {item.href ? (
            <Link 
              href={item.href} 
              className="transition-colors hover:text-digital"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-800 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
