import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SincronizacaoDashboard } from '@/components/admin/sincronizacao-dashboard'

export const metadata: Metadata = {
  title: 'Sincronização',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function SincronizacaoPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Suspense fallback={null}>
        <SincronizacaoDashboard />
      </Suspense>
    </main>
  )
}
