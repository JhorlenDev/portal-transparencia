"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { PaginationMeta } from "@/lib/site-data"

interface PaginationControlsProps {
  pagination: PaginationMeta
}

function pageHref(pathname: string, searchParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(searchParams.toString())

  if (page <= 1) {
    params.delete("page")
  } else {
    params.set("page", String(page))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function PaginationControls({ pagination }: PaginationControlsProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { page, pageSize, total, totalPages } = pagination

  if (totalPages <= 1) {
    return (
      <p className="mt-4 text-sm text-slate-600">
        Exibindo {total} registro{total === 1 ? "" : "s"}.
      </p>
    )
  }

  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, total)
  const previousPage = Math.max(1, page - 1)
  const nextPage = Math.min(totalPages, page + 1)
  const nearbyPages = Array.from(new Set([1, page - 1, page, page + 1, totalPages]))
    .filter((item) => item >= 1 && item <= totalPages)
    .sort((a, b) => a - b)

  return (
    <nav className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Paginação">
      <p className="text-sm text-slate-600">
        Exibindo {firstItem}-{lastItem} de {total} registros.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={pageHref(pathname, searchParams, previousPage)}
          aria-disabled={page === 1}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            page === 1
              ? "pointer-events-none border-slate-200 text-slate-400"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Link>

        {nearbyPages.map((item, index) => {
          const previous = nearbyPages[index - 1]
          const hasGap = previous && item - previous > 1

          return (
            <span key={item} className="flex items-center gap-2">
              {hasGap && <span className="text-sm text-slate-400">...</span>}
              <Link
                href={pageHref(pathname, searchParams, item)}
                aria-current={item === page ? "page" : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors ${
                  item === page
                    ? "border-digital bg-digital text-white"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {item}
              </Link>
            </span>
          )
        })}

        <Link
          href={pageHref(pathname, searchParams, nextPage)}
          aria-disabled={page === totalPages}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            page === totalPages
              ? "pointer-events-none border-slate-200 text-slate-400"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </nav>
  )
}
