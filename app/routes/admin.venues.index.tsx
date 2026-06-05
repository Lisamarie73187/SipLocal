import { createFileRoute } from '@tanstack/react-router'

import { AdminLayout } from '@/components/AdminLayout/AdminLayout'
import { AdminVenuesList } from '@/components/AdminVenuesList/AdminVenuesList'

export const Route = createFileRoute('/admin/venues/')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    city: typeof search.city === 'string' ? search.city : undefined,
    saved: typeof search.saved === 'string' ? search.saved : undefined,
    notice: typeof search.notice === 'string' ? search.notice : undefined,
  }),
  component: AdminVenuesIndexPage,
})

function AdminVenuesIndexPage() {
  const { city, saved, notice } = Route.useSearch()

  return (
    <AdminLayout
      title="Venues"
      description="All saved venues for a city. The public map shows every live + published venue with live slots (including seed data)—not just your latest edit."
    >
      <AdminVenuesList
        initialCitySlug={city}
        savedVenueId={saved}
        savedNotice={notice}
      />
    </AdminLayout>
  )
}
