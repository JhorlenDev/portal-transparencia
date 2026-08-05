import { Suspense } from 'react'
import type { Metadata } from 'next'
import { BackupDashboard } from '@/components/admin/backup-dashboard'

export const metadata: Metadata = {
  title: 'Backup',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function BackupPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Suspense fallback={null}>
        <BackupDashboard />
      </Suspense>
    </main>
  )
}
