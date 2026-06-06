import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/components/AdminLayout/AdminLayout'
import { AdminVenuesList } from '@/components/AdminVenuesList/AdminVenuesList'
import { parseAdminVenuesListSearch } from '@/utils/adminVenuesListSearch'

export const Route = createFileRoute('/admin/venues/')({
  ssr: false,
  validateSearch: parseAdminVenuesListSearch,
  component: AdminVenuesIndexPage,
})

function AdminVenuesIndexPage() {
  const listSearch = Route.useSearch()

  return (
    <AdminLayout
      title="Venues"
      description="Active venues for a city. Use the tabs to filter by status; toggle Has events to narrow any tab."
    >
      <AdminVenuesList listSearch={listSearch} />
    </AdminLayout>
  )
}
