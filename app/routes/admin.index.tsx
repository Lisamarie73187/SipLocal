import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/components/AdminLayout/AdminLayout'
import { AdminDiscoverPanel } from '@/components/AdminDiscoverPanel/AdminDiscoverPanel'
import { AdminPendingUpdatesPanel } from '@/components/AdminPendingUpdatesPanel/AdminPendingUpdatesPanel'

export const Route = createFileRoute('/admin/')({
  ssr: false,
  component: AdminDiscoverPage,
})

function AdminDiscoverPage() {
  return (
    <AdminLayout
      title="Discover venues"
      description="Paste restaurant names — Google Places fills address, phone, website, and coordinates. Edit venues manually to add happy hours and publish to the map."
    >
      <div className="space-y-10">
        <AdminPendingUpdatesPanel />
        <AdminDiscoverPanel />
      </div>
    </AdminLayout>
  )
}
