import { Skeleton } from "./skeleton"

function CardSkeleton() {
  return (
    <div className="rounded-xl bg-card p-6">
      <Skeleton className="h-4 w-1/3 mb-4" />
      <Skeleton className="h-8 w-1/2" />
    </div>
  )
}

function StatsCardSkeleton() {
  return (
    <div className="rounded-xl p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  )
}

function TableRowSkeleton() {
  return (
    <tr>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
    </tr>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-md">
      <table className="w-full">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left px-4 py-3"><Skeleton className="h-4 w-20" /></th>
            <th className="text-left px-4 py-3"><Skeleton className="h-4 w-32" /></th>
            <th className="text-left px-4 py-3"><Skeleton className="h-4 w-24" /></th>
            <th className="text-right px-4 py-3"><Skeleton className="h-4 w-20" /></th>
            <th className="text-right px-4 py-3"><Skeleton className="h-4 w-20" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
      <TableSkeleton />
    </div>
  )
}

export { Skeleton, CardSkeleton, StatsCardSkeleton, TableRowSkeleton, TableSkeleton, PageSkeleton }
